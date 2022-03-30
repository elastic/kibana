/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import xml2js from 'xml2js';
import uuid from 'uuid/v4';
import { Canvg } from 'canvg';
import calcSDF from 'bitmap-sdf';
import {
  CUSTOM_ICON_SIZE,
  CUSTOM_ICON_PREFIX_SDF,
  MAKI_ICON_SIZE,
} from '../../../../common/constants';
import { parseXmlString } from '../../../../common/parse_xml_string';
import { SymbolIcon } from './components/legend/symbol_icon';
import { getIsDarkMode } from '../../../kibana_services';
import { MAKI_ICONS } from './maki_icons';

export const CUSTOM_ICON_PIXEL_RATIO = Math.floor(
  window.devicePixelRatio * (CUSTOM_ICON_SIZE / MAKI_ICON_SIZE) * 0.75
);

export const SYMBOL_OPTIONS = Object.entries(MAKI_ICONS).map(([value, { svg, label }]) => {
  return {
    value,
    label,
    svg,
  };
});

/**
 * Converts a SVG icon to a PNG image using a signed distance function (SDF).
 *
 * @param {string} svgString - SVG icon as string
 * @param {number} [renderSize=64] - size of the output PNG (higher provides better resolution but requires more processing)
 * @param {number} [cutoff=0.25] - balance between SDF inside 1 and outside 0 of icon
 * @param {number} [radius=0.25] - size of SDF around the cutoff as percent of output icon size
 * @return {ImageData} image that can be added to a MapLibre map with option `{ sdf: true }`
 */
export async function createSdfIcon({ svg, renderSize = 64, cutoff = 0.25, radius = 0.25 }) {
  const buffer = 3;
  const size = renderSize + buffer * 4;
  const svgCanvas = document.createElement('canvas');
  svgCanvas.width = size;
  svgCanvas.height = size;
  const svgCtx = svgCanvas.getContext('2d');
  const v = Canvg.fromString(svgCtx, svg, {
    ignoreDimensions: true,
    offsetX: buffer / 2,
    offsetY: buffer / 2,
  });
  v.resize(size - buffer, size - buffer);
  await v.render();

  const distances = calcSDF(svgCtx, {
    channel: 3,
    cutoff,
    radius: radius * size,
  });

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      imageData.data[j * size * 4 + i * 4 + 0] = 0;
      imageData.data[j * size * 4 + i * 4 + 1] = 0;
      imageData.data[j * size * 4 + i * 4 + 2] = 0;
      imageData.data[j * size * 4 + i * 4 + 3] = distances[j * size + i] * 255;
    }
  }
  return imageData;
}

export function getMakiSymbol(symbolId) {
  return MAKI_ICONS?.[symbolId];
}

export function getMakiSymbolAnchor(symbolId) {
  switch (symbolId) {
    case 'embassy':
    case 'marker':
    case 'marker-stroked':
      return 'bottom';
    default:
      return 'center';
  }
}

export function getCustomIconId() {
  return `${CUSTOM_ICON_PREFIX_SDF}${uuid()}`;
}

export function buildSrcUrl(svgString) {
  const domUrl = window.URL || window.webkitURL || window;
  const svg = new Blob([svgString], { type: 'image/svg+xml' });
  return domUrl.createObjectURL(svg);
}

export async function styleSvg(svgString, fill, stroke) {
  const svgXml = await parseXmlString(svgString);
  let style = '';
  if (fill) {
    style += `fill:${fill};`;
  }
  if (stroke) {
    style += `stroke:${stroke};`;
    style += `stroke-width:1;`;
  }
  if (style) svgXml.svg.$.style = style;
  const builder = new xml2js.Builder();
  return builder.buildObject(svgXml);
}

const ICON_PALETTES = [
  {
    id: 'filledShapes',
    icons: ['circle', 'marker', 'square', 'star', 'triangle', 'hospital'],
  },
  {
    id: 'hollowShapes',
    icons: [
      'circle-stroked',
      'marker-stroked',
      'square-stroked',
      'star-stroked',
      'triangle-stroked',
    ],
  },
];

// PREFERRED_ICONS is used to provide less random default icon values for forms that need default icon values
export const PREFERRED_ICONS = [];
ICON_PALETTES.forEach((iconPalette) => {
  iconPalette.icons.forEach((icon) => {
    if (!PREFERRED_ICONS.includes(icon)) {
      PREFERRED_ICONS.push(icon);
    }
  });
});

export function getIconPaletteOptions() {
  const isDarkMode = getIsDarkMode();
  return ICON_PALETTES.map(({ id, icons }) => {
    const iconsDisplay = icons.map((iconId) => {
      const style = {
        width: '10%',
        position: 'relative',
        height: '100%',
        display: 'inline-block',
        paddingTop: '4px',
      };
      return (
        <div style={style} key={iconId}>
          <SymbolIcon
            className="mapIcon"
            symbolId={iconId}
            fill={isDarkMode ? 'rgb(223, 229, 239)' : 'rgb(52, 55, 65)'}
            svg={getMakiSymbol(iconId).svg}
          />
        </div>
      );
    });
    return {
      value: id,
      inputDisplay: <div>{iconsDisplay}</div>,
    };
  });
}

export function getIconPalette(paletteId) {
  const palette = ICON_PALETTES.find(({ id }) => id === paletteId);
  return palette ? [...palette.icons] : [];
}
