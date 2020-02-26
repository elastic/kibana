/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { darken, saturate } from 'polished';

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
  | 'runningProcessEnd';

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
      y2="1"
      spreadMethod="reflect"
      gradientUnits="objectBoundingBox"
    >
      <stop offset="0%" stopColor={NamedColors.runningProcessStart} stopOpacity="1" />
      <stop offset="100%" stopColor={NamedColors.runningProcessEnd} stopOpacity="1" />
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
      viewBox="-10 0 128.6889 29.31389"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x=".97904" y=".89113" width="106.96" height="27.627" rx="1.3357" ry="1.1398" fill={`url(#${PaintServerIds.darkLinearReflect})`} stroke={NamedColors.ok} stroke-width=".88" paintOrder="normal"/>
    </symbol>
    <symbol
      id={SymbolIds.processNodeWithHorizontalRule}
      viewBox="-10 0 128.6889 29.31389"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x=".97904" y=".89113" width="106.96" height="27.627" rx="1.3357" ry="1.1398" fill={`url(#${PaintServerIds.darkLinearReflect})`} stroke={NamedColors.ok} stroke-width=".88" paintOrder="normal"/>
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

    <symbol id={SymbolIds.runningProcessCube} viewBox="0 0 66 73">
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
        <animate
          attributeName="opacity"
          values=".1 ; .75 ; .5 ; .25 ; .1"
          keyTimes="0 ; 0.25 ; 0.5 ; 0.75 ; 1"
          begin="DOMNodeInsertedIntoDocument"
          dur="3.5s"
          repeatCount="indefinite"
        />
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
