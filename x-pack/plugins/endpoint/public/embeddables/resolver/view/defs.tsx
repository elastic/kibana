/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { darken } from 'polished';

import {
  htmlIdGenerator,
  // qualitative pallette functions.
  //  See: https://elastic.github.io/eui/#/utilities/color-palettes
  euiPaletteForTemperature,
  euiPaletteForStatus,
  colorPalette,
} from '@elastic/eui';

// Generating from `colorPalette` function: This could potentially
//  pick up a palette shift and decouple from raw hex
const [euiColorEmptyShade, , , , , euiColor85Shade, euiColorFullShade] = colorPalette(
  ['#ffffff', '#000000'],
  7
);

// A catalog of arbitraged colors
const resolverPalette: Record<string, string | string[]> = {
  temperatures: euiPaletteForTemperature(7),
  statii: euiPaletteForStatus(7),
  fullShade: euiColorFullShade,
  emptyShade: euiColorEmptyShade,
};

/* 
Define colors by semantics like so:
`danger`, `attention`, `enabled`, `disabled`
Or by function like:
`colorBlindBackground`, `subMenuForeground` 
*/
type ResolverColorNames = 'ok' | 'okdark' | 'empty' | 'full' | 'warning' | 'strokeBehindEmpty';

export const NamedColors: Record<ResolverColorNames, string> = {
  ok: resolverPalette.temperatures[2],
  okdark: resolverPalette.temperatures[0],
  empty: euiColorEmptyShade,
  full: euiColorFullShade,
  strokeBehindEmpty: euiColor85Shade,
  warning: resolverPalette.statii[3],
};

const idGenerator = htmlIdGenerator();

// To be referenced in fill and stroke attributes
export const PaintServerIds = {
  darkLinearReflect: idGenerator('darkreflect'),
};

// PaintServers: Where color palettes, grandients, patterns and other similar concerns
//    are exposed to the component
const PaintServers = memo(() => (
  <>
    <linearGradient
      id={PaintServerIds.darkLinearReflect}
      x1="-100"
      y1="-30"
      x2="100"
      y2="30"
      spreadMethod="reflect"
      gradientUnits="userSpaceOnUse"
    >
      <stop offset="0%" stopColor={NamedColors.okdark} stopOpacity="1" />
      <stop offset="100%" stopColor={darken(0.15, NamedColors.okdark)} stopOpacity="1" />
    </linearGradient>
  </>
));

// To be referenced by <use> elements
export const SymbolIds = {
  processNode: idGenerator('curveSymbol'),
  solidHexagon: idGenerator('hexagon'),
};

// SymbolsAndShapes: defs that define shapes, masks and other spatial elements
const SymbolsAndShapes = memo(() => (
  <>
    <symbol id={SymbolIds.processNode} viewBox="0 0 108.6889 29.31389">
      <desc>A shape representing a node in a graph</desc>
      <g transform="translate(-52.244835,-115.27758)">
        <g
          fill={`url(#${PaintServerIds.darkLinearReflect})`}
          fillOpacity="1"
          paintOrder="normal"
          strokeWidth="0.79375"
          strokeMiterlimit="4"
        >
          <g transform="matrix(0.26458333,0,0,0.26458333,53.672616,-135.2738)">
            <path
              strokeWidth="3.00000004"
              stroke={NamedColors.ok}
              strokeLinecap="butt"
              strokeLinejoin="round"
              strokeOpacity="0.94117647"
              d="M 3,1014.0043 C 1.9285712,955.24249 2.5,954.53017 50,955.42048 h 300 c 47.14282,-1.33548 47.71427,-0.62325 47,58.58382"
            />
            <path
              strokeWidth="3.00000004"
              stroke={NamedColors.ok}
              strokeLinecap="butt"
              strokeLinejoin="round"
              strokeOpacity="0.94117647"
              d="m 397,1002.3622 c 1.07142,47.1428 0.5,47.7143 -47,47 H 50 c -47.1428203,1.0714 -47.71427,0.4994 -47,-47"
            />
          </g>
        </g>
      </g>
    </symbol>
    <symbol id={SymbolIds.solidHexagon} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
      <g transform="translate(0,-97)">
        <path
          transform="matrix(1.6461 0 0 1.6596 -56.401 -64.183)"
          d="m95.148 97.617 28.238 16.221 23.609 13.713 0.071 32.566-0.071 27.302-28.167 16.344-23.68 13.59-28.238-16.221-23.609-13.713-0.07098-32.566 0.07098-27.302 28.167-16.344z"
          fill="#0c1111"
        />
      </g>
    </symbol>
  </>
));

export const SymbolDefinitions = memo(() => (
  <svg className="resolver_defs">
    <defs>
      <PaintServers />
      <SymbolsAndShapes />
    </defs>
  </svg>
));
