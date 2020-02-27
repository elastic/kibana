/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { darken, saturate, lighten } from 'polished';

import {
  htmlIdGenerator,
  euiPaletteForTemperature,
  euiPaletteForStatus,
  colorPalette,
} from '@elastic/eui';

/**
 * Generating from `colorPalette` function: This could potentially
 * pick up a palette shift and decouple from raw hex
 */
const [euiColorEmptyShade, , , , , euiColor85Shade, euiColorFullShade] = colorPalette(
  ['#ffffff', '#000000'],
  7
);

/**
 * Base Colors - sourced from EUI
 */
const resolverPalette: Record<string, string | string[]> = {
  temperatures: euiPaletteForTemperature(7),
  statii: euiPaletteForStatus(7),
  fullShade: euiColorFullShade,
  emptyShade: euiColorEmptyShade,
};

/**
 * Defines colors by semantics like so:
 * `danger`, `attention`, `enabled`, `disabled`
 * Or by function like:
 * `colorBlindBackground`, `subMenuForeground`
 */
type ResolverColorNames =
  | 'ok'
  | 'okdark'
  | 'empty'
  | 'full'
  | 'warning'
  | 'strokeBehindEmpty'
  | 'resolverBackground'
  | 'runningProcessStart'
  | 'runningProcessEnd'
  | 'activeNoWarning'

export const NamedColors: Record<ResolverColorNames, string> = {
  ok: saturate(0.5, resolverPalette.temperatures[0]),
  okdark: darken(0.2, resolverPalette.temperatures[0]),
  empty: euiColorEmptyShade,
  full: euiColorFullShade,
  strokeBehindEmpty: euiColor85Shade,
  warning: resolverPalette.statii[3],
  resolverBackground: euiColor85Shade,
  runningProcessStart: "#006BB4",
  runningProcessEnd: "#017D73",
  activeNoWarning: "#0078FF",
};

const idGenerator = htmlIdGenerator();

/**
 * Ids of paint servers to be referenced by fill and stroke attributes
 */
export const PaintServerIds = {
  darkLinearReflect: idGenerator('darkreflect'),
  runningProcess: idGenerator('runningProcess'),
};

/**
 * PaintServers: Where color palettes, grandients, patterns and other similar concerns
 * are exposed to the component
 */
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
      <stop offset="100%" stopColor={darken(0.1, NamedColors.okdark)} stopOpacity="1" />
    </linearGradient>
    <linearGradient
      id={PaintServerIds.runningProcess}
      x1="0"
      y1="0"
      x2="1"
      y2="0"
      spreadMethod="reflect"
      gradientUnits="objectBoundingBox"
    >
      <stop offset="0%" stopColor={saturate(.7, lighten(0.05, NamedColors.runningProcessStart))} stopOpacity="1" />
      <stop offset="100%" stopColor={saturate(.7, lighten(0.05, NamedColors.runningProcessEnd))} stopOpacity="1" />
    </linearGradient>
    <linearGradient id="linear-gradient" x1="-382.33074" y1="265.24689" x2="-381.88086" y2="264.46019" gradientTransform="matrix(88, 0, 0, -100, 33669, 26535)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor={NamedColors.runningProcessStart}/>
      <stop offset="1" stopColor={NamedColors.runningProcessEnd}/>
    </linearGradient>
  </>
));

/**
 * Ids of symbols to be linked by <use> elements
 */
export const SymbolIds = {
  processNode: idGenerator('nodeSymbol'),
  processNodeWithHorizontalRule: idGenerator('nodeSymbolWithHR'),
  solidHexagon: idGenerator('hexagon'),
  runningProcessCube: idGenerator('runningCube'),
};

/**
 * Defs entries that define shapes, masks and other spatial elements
 */
const SymbolsAndShapes = memo(() => (
  <>
    <symbol
      id={SymbolIds.processNode}
      viewBox="0 0 144 25"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x="1" y="1" width="142" height="23" fill={`url(#${PaintServerIds.runningProcess})`} strokeWidth="0" paintOrder="normal"/>
    </symbol>
    <symbol
      id={SymbolIds.processNodeWithHorizontalRule}
      viewBox="-10 0 188.6889 29.31389"
      preserveAspectRatio="xMinYMin slice"
    >
      <rect x=".97904" y=".89113" width="156.96" height="27.627" rx="1.3357" ry="1.1398" fill={`url(#${PaintServerIds.runningProcess})`} strokeWidth=".88" paintOrder="normal"/>
      <line x1="1.425" x2="108.5" y1="10" y2="10" stroke={NamedColors.ok} strokeWidth="0.449" />
    </symbol>

    <symbol id={SymbolIds.solidHexagon} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
      <g transform="translate(0,-97)">
        <path
          transform="matrix(1.6461 0 0 1.6596 -56.401 -64.183)"
          d="m95.148 97.617 28.238 16.221 23.609 13.713 0.071 32.566-0.071 27.302-28.167 16.344-23.68 13.59-28.238-16.221-23.609-13.713-0.07098-32.566 0.07098-27.302 28.167-16.344z"
          fill="inherit"
          strokeWidth="15"
          stroke="inherit"
        />
      </g>
    </symbol>

    <symbol id={SymbolIds.runningProcessCube+'off'} viewBox="0 0 66 73">
      <filter id="filter-3" x="-37.5%" y="-34.9%" width="175%" height="169.8%">
        <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="shadowSpreadOuter1"/>
        <feOffset dx="0" dy="0" in="shadowSpreadOuter1" result="shadowOffsetOuter1"/>
        <feGaussianBlur in="shadowOffsetOuter1" result="shadowBlurOuter1" stdDeviation="2.5"/>
        <feColorMatrix in="shadowBlurOuter1" values="0 0 0 0 1   0 0 0 0 1   0 0 0 0 1  0 0 0 0.0366586538 0"></feColorMatrix>
      </filter>
      <title>Group 2</title>
      <desc>Created with Sketch.</desc>
      <polygon
      fill={`url(#${PaintServerIds.runningProcess})`}
      points="11.4 24.2 33.5 11.3 55.4 24.2 55.4 48.6 33.5 61.3 11.4 48.6"/>
      <polygon id="Path" opacity="0.2518" points="33.4 61.3 33.9 37.6 11.4 24.3 11.4 48.6"/>
      <g transform="translate(23.5 33.217) rotate(180) translate(-8.5 -10)" opacity=".5">
        <polygon id="Path-4_1_" fill="#FFFFFF" points="-10.4 0.9 -1.8 -4.1 6.6 0.9 6.6 10.4 -1.8 15.3 -10.4 10.4"/>
        <polygon fill="#D8D8D8" points="-10.4 0.9 -1.9 5.6 -1.9 15.3 -10.4 10.4"/>
        <polygon  fill="#959595" points="-1.9 15.3 -1.9 5.6 6.6 0.9 6.6 10.4"/>
        
      </g>
      <g id="Path-4_2_" opacity="0.7504">
        <g filter="url(#filter-3)">
          <polygon id="path-2_2_" points="11.4 24.2 33.5 11.3 55.4 24.2 55.4 48.6 33.5 61.3 11.4 48.6"/>
        </g>
        <polygon id="path-2_1_" fill="url(#path-2_2_)" points="11.4 24.2 33.5 11.3 55.4 24.2 55.4 48.6 33.5 61.3 11.4 48.6"/>
      </g>
      <polygon id="Path_1_" opacity="0.2518" points="33.4 61.3 33.9 37.6 11.4 24.3 11.4 48.6"/>
      <polygon id="Path_2_" opacity="0.1389" fill="#FFFFFF" points="55.4 24.3 33.4 11.3 11.4 24.3 33.9 37.6"/>
    </symbol>
    <symbol id={SymbolIds.runningProcessCube} viewBox="0 0 88 100">
        <title>Running Process</title>
        <g id="_2.19-Style" data-name="2.19-Style">
          <g id="Dark-Resolver-_-LP">
            <g id="Running-Process">
              <polygon id="Path-4-Copy-11" points="0 25.839 44.23 0 88 25.839 88 74.688 44.23 100 0 74.688 0 25.839" fill="#1d1e24" />
              <polygon id="Path-Copy-16" points="44.23 100 44 50 0 25.839 0 74.664 44.23 100" opacity="0.25179" style={{isolation: 'isolate'}}/>
              <polygon id="Path-4" points="27 41.077 44.089 31 61 41.077 61 60.128 44.089 70 27 60.128 27 41.077" fill="#fff" />
              <polygon id="Path-11" points="44 31 61 41.077 61 60.128 44 50 44 31" fill="#d8d8d8" />
              <polygon id="Path-12" points="27 60.128 27 41.077 44 31 44 50 27 60.128" fill="#959595" />
              <polygon id="Path-4-Copy-12" points="0 25.839 44.23 0 88 25.839 88 74.688 44.23 100 0 74.688 0 25.839" opacity="0.74744" fill={"url(#linear-gradient)"} style={{isolation: 'isolate'}} />
              <polygon id="Path-Copy-17" points="88 25.839 44.23 0 0 25.839 44 50 88 25.839" fill="#fff" opacity="0.13893" style={{isolation: 'isolate'}} />
              <polygon id="Path-Copy-16-2" points="44.23 100 44 50 0 25.839 0 74.664 44.23 100" opacity="0.25179" style={{isolation: 'isolate'}} />
            </g>
        </g>
      </g>
    </symbol>
  </>
));

/**
 * This <defs> element is used to define the reusable assets for the Resolver
 * It confers sevral advantages, including but not limited to:
 * 1) Freedom of form for creative assets (beyond box-model constraints)
 * 2) Separation of concerns between creative assets and more functional areas of the app
 * 3) <use> elements can be handled by compositor (faster)
 */
export const SymbolDefinitions = memo(() => (
  <svg>
    <defs>
      <PaintServers />
      <SymbolsAndShapes />
    </defs>
  </svg>
));
