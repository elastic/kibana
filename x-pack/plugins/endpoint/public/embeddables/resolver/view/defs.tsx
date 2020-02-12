/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { darken } from 'polished';

import {
  // qualitative pallette functions.
  //  See: https://elastic.github.io/eui/#/utilities/color-palettes
  euiPaletteForTemperature,
  euiPaletteForStatus,
  colorPalette,
  htmlIdGenerator,
} from '@elastic/eui';

const [euiColorEmptyShade, euiColorFullShade] = colorPalette(['#ffffff', '#000000'], 2);

const resolverPallette = {
  temperatures: euiPaletteForTemperature(7),
  statii: euiPaletteForStatus(7),
  fullShade: euiColorFullShade,
  emptyShade: euiColorEmptyShade,
};

type ResolverColorNames = 'ok' | 'okdark' | 'empty' | 'full' | 'warning';
/* Define colors by meaning against the EUI pallette like so:
danger = resolverPallette.,
attention = resolverPallette.,
enabled = resolverPallette.,
disabled = resolverPallette.,
*/
export const NamedColors: Record<ResolverColorNames, string> = {
  ok: resolverPallette.temperatures[2],
  okdark: resolverPallette.temperatures[0],
  empty: euiColorEmptyShade,
  full: euiColorFullShade,
  warning: resolverPallette.statii[3],
};

// PaintServers: Where color pallettes and other similar concerns are exposed to the component
const PaintServers = memo(() => (
  <>
    <linearGradient
      id="OK_userSpaceNWtoSE_Solid"
      x1="-50"
      y1="-50"
      x2="50"
      y2="50"
      spreadMethod="pad"
      gradientUnits="userSpaceOnUse"
    >
      <stop offset="0%" stopColor={NamedColors.ok} stopOpacity="1" />
      <stop offset="100%" stopColor={darken(0.2, NamedColors.ok)} stopOpacity="1" />
    </linearGradient>
    <linearGradient
      id="OKDarker_userSpaceNWtoSE_Solid"
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
    <linearGradient
      id="Foreground_userSpaceNWtoSE_Solid"
      x1="-50"
      y1="-50"
      x2="50"
      y2="50"
      spreadMethod="pad"
      gradientUnits="userSpaceOnUse"
    >
      <stop offset="0%" stopColor={NamedColors.empty} stopOpacity="1" />
      <stop offset="100%" stopColor={NamedColors.empty} stopOpacity="1" />
    </linearGradient>
    <linearGradient
      id="Background_userSpaceNWtoSE_Solid"
      x1="-50"
      y1="-50"
      x2="50"
      y2="50"
      spreadMethod="pad"
      gradientUnits="userSpaceOnUse"
    >
      <stop offset="0%" stopColor={NamedColors.full} stopOpacity="1" />
      <stop offset="100%" stopColor={NamedColors.full} stopOpacity="1" />
    </linearGradient>
  </>
));

// SymbolsAndShapes: defs that define shapes, masks and other spatial elements
const SymbolsAndShapes = memo(() => (
  <>
    <symbol id="node_icon_curve" viewBox="0 0 108.6889 29.31389">
      <desc>A shape representing a node in a graph</desc>
      <g transform="translate(-52.244835,-115.27758)">
        <g
          fill="url(#OKDarker_userSpaceNWtoSE_Solid)"
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
