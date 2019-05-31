/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { maki } from '@kbn/maki';
import xml2js from 'xml2js';
import { parseXmlString } from '../../../../common/parse_xml_string';

export const SYMBOLS = {};
maki.svgArray.forEach(svgString => {
  const ID_FRAG = 'id="';
  const index = svgString.indexOf(ID_FRAG);
  if (index !== -1) {
    const idStartIndex = index + ID_FRAG.length;
    const idEndIndex = svgString.substring(idStartIndex).indexOf('"') + idStartIndex;
    const symbolId = svgString.substring(idStartIndex, idEndIndex);
    SYMBOLS[symbolId] = svgString;
  }
});

export function getSymbolSvg(symbolId) {
  if (!SYMBOLS[symbolId]) {
    throw new Error(`Unable to find symbol: ${symbolId}`);
  }
  return SYMBOLS[symbolId];
}

export function buildSrcUrl(svgString) {
  const domUrl = window.URL || window.webkitURL || window;
  const svg = new Blob([svgString], { type: 'image/svg+xml' });
  return domUrl.createObjectURL(svg);
}

export async function styleSvg(svgString, fill) {
  const svgXml = await parseXmlString(svgString);
  if (fill) {
    svgXml.svg.$.style = `fill: ${fill};`;
  }
  const builder = new xml2js.Builder();
  return builder.buildObject(svgXml);
}

function addImageToMap(imageUrl, imageId, symbolId, mbMap) {
  return new Promise((resolve, reject) => {
    const symbolSize = symbolId.includes('11') ? 11 : 15;
    const img = new Image(symbolSize, symbolSize);
    img.onload = () => {
      mbMap.addImage(imageId, img);
      resolve();
    };
    img.onerror = (err) => {
      reject(err);
    };
    img.src = imageUrl;
  });
}

export async function loadImage(imageId, symbolId, color, mbMap) {
  let symbolSvg;
  try {
    symbolSvg = getSymbolSvg(symbolId);
  } catch(error) {
    return;
  }

  const styledSvg = await styleSvg(symbolSvg, color);
  const imageUrl = buildSrcUrl(styledSvg);

  await addImageToMap(imageUrl, imageId, symbolId, mbMap);
}
