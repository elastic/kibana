/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { saturate, lighten } from 'polished';

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
  | 'empty'
  | 'full'
  | 'warning'
  | 'strokeBehindEmpty'
  | 'resolverBackground'
  | 'runningProcessStart'
  | 'runningProcessEnd'
  | 'runningTriggerStart'
  | 'runningTriggerEnd'
  | 'activeNoWarning'
  | 'activeWarning'
  | 'fullLabelBackground'
  | 'inertDescription';

export const NamedColors: Record<ResolverColorNames, string> = {
  ok: saturate(0.5, resolverPalette.temperatures[0]),
  empty: euiColorEmptyShade,
  full: euiColorFullShade,
  strokeBehindEmpty: euiColor85Shade,
  warning: resolverPalette.statii[3],
  resolverBackground: euiColorFullShade,
  runningProcessStart: '#006BB4',
  runningProcessEnd: '#017D73',
  runningTriggerStart: '#BD281E',
  runningTriggerEnd: '#DD0A73',
  activeNoWarning: '#0078FF',
  activeWarning: '#C61F38',
  fullLabelBackground: '#3B3C41',
  inertDescription: '#747474',
};

const idGenerator = htmlIdGenerator();

/**
 * Ids of paint servers to be referenced by fill and stroke attributes
 */
export const PaintServerIds = {
  runningProcess: idGenerator('psRunningProcess'),
  runningTrigger: idGenerator('psRunningTrigger'),
  runningProcessCube: idGenerator('psRunningProcessCube'),
  runningTriggerCube: idGenerator('psRunningTriggerCube'),
  terminatedProcessCube: idGenerator('psTerminatedProcessCube'),
  terminatedTriggerCube: idGenerator('psTerminatedTriggerCube'),
};

/**
 * PaintServers: Where color palettes, grandients, patterns and other similar concerns
 * are exposed to the component
 */
const PaintServers = memo(() => (
  <>
    <linearGradient
      id={PaintServerIds.runningProcess}
      x1="0"
      y1="0"
      x2="1"
      y2="0"
      spreadMethod="reflect"
      gradientUnits="objectBoundingBox"
    >
      <stop
        offset="0%"
        stopColor={saturate(0.7, lighten(0.05, NamedColors.runningProcessStart))}
        stopOpacity="1"
      />
      <stop
        offset="100%"
        stopColor={saturate(0.7, lighten(0.05, NamedColors.runningProcessEnd))}
        stopOpacity="1"
      />
    </linearGradient>
    <linearGradient
      id={PaintServerIds.runningTrigger}
      x1="0"
      y1="0"
      x2="1"
      y2="0"
      spreadMethod="reflect"
      gradientUnits="objectBoundingBox"
    >
      <stop
        offset="0%"
        stopColor={saturate(0.7, lighten(0.05, NamedColors.runningTriggerStart))}
        stopOpacity="1"
      />
      <stop
        offset="100%"
        stopColor={saturate(0.7, lighten(0.05, NamedColors.runningTriggerEnd))}
        stopOpacity="1"
      />
    </linearGradient>
    <linearGradient
      id={PaintServerIds.runningProcessCube}
      x1="-382.33074"
      y1="265.24689"
      x2="-381.88086"
      y2="264.46019"
      gradientTransform="matrix(88, 0, 0, -100, 33669, 26535)"
      gradientUnits="userSpaceOnUse"
    >
      <stop offset="0" stopColor={NamedColors.runningProcessStart} />
      <stop offset="1" stopColor={NamedColors.runningProcessEnd} />
    </linearGradient>
    <linearGradient
      id={PaintServerIds.runningTriggerCube}
      x1="-382.32713"
      y1="265.24057"
      x2="-381.88108"
      y2="264.46057"
      gradientTransform="matrix(88, 0, 0, -100, 33669, 26535)"
      gradientUnits="userSpaceOnUse"
    >
      <stop offset="0" stopColor="#bd281f" />
      <stop offset="1" stopColor="#dc0b72" />
    </linearGradient>
    <linearGradient
      id={PaintServerIds.terminatedProcessCube}
      x1="-382.33074"
      y1="265.24689"
      x2="-381.88086"
      y2="264.46019"
      gradientTransform="matrix(88, 0, 0, -100, 33669, 26535)"
      gradientUnits="userSpaceOnUse"
    >
      <stop offset="0" stopColor="#006bb4" />
      <stop offset="1" stopColor="#017d73" />
    </linearGradient>
    <linearGradient
      id={PaintServerIds.terminatedTriggerCube}
      x1="-382.33074"
      y1="265.24689"
      x2="-381.88086"
      y2="264.46019"
      gradientTransform="matrix(88, 0, 0, -100, 33669, 26535)"
      gradientUnits="userSpaceOnUse"
    >
      <stop offset="0" stopColor="#be2820" />
      <stop offset="1" stopColor="#dc0b72" />
    </linearGradient>
  </>
));

/**
 * Ids of symbols to be linked by <use> elements
 */
export const SymbolIds = {
  processNode: idGenerator('nodeSymbol'),
  solidHexagon: idGenerator('hexagon'),
  runningProcessCube: idGenerator('runningCube'),
  runningTriggerCube: idGenerator('runningTriggerCube'),
  terminatedProcessCube: idGenerator('terminatedCube'),
  terminatedTriggerCube: idGenerator('terminatedTriggerCube'),
};

/**
 * Defs entries that define shapes, masks and other spatial elements
 */
const SymbolsAndShapes = memo(() => (
  <>
    <symbol id={SymbolIds.processNode} viewBox="0 0 144 25" preserveAspectRatio="xMidYMid meet">
      <rect
        x="1"
        y="1"
        width="142"
        height="23"
        fill="inherit"
        strokeWidth="0"
        paintOrder="normal"
      />
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
    <symbol id={SymbolIds.runningProcessCube} viewBox="0 0 88 100">
      <title>Running Process</title>
      <g>
        <polygon
          points="0 25.839 44.23 0 88 25.839 88 74.688 44.23 100 0 74.688 0 25.839"
          fill="#1d1e24"
        />
        <polygon
          points="44.23 100 44 50 0 25.839 0 74.664 44.23 100"
          opacity="0.25179"
          style={{ isolation: 'isolate' }}
        />
        <polygon
          points="27 41.077 44.089 31 61 41.077 61 60.128 44.089 70 27 60.128 27 41.077"
          fill="#fff"
        />
        <polygon points="44 31 61 41.077 61 60.128 44 50 44 31" fill="#d8d8d8" />
        <polygon points="27 60.128 27 41.077 44 31 44 50 27 60.128" fill="#959595" />
        <polygon
          points="0 25.839 44.23 0 88 25.839 88 74.688 44.23 100 0 74.688 0 25.839"
          opacity="0.74744"
          fill={`url(#${PaintServerIds.runningProcessCube})`}
          style={{ isolation: 'isolate' }}
        />
        <polygon
          points="88 25.839 44.23 0 0 25.839 44 50 88 25.839"
          fill="#fff"
          opacity="0.13893"
          style={{ isolation: 'isolate' }}
        />
        <polygon
          points="44.23 100 44 50 0 25.839 0 74.664 44.23 100"
          opacity="0.25179"
          style={{ isolation: 'isolate' }}
        />
      </g>
    </symbol>
    <symbol id={SymbolIds.runningTriggerCube} viewBox="0 0 88 100">
      <title>Running Trigger Process</title>
      <g>
        <polygon
          points="0 25.839 44.23 0 88 25.839 88 74.688 44.23 100 0 74.688 0 25.839"
          fill="#1d1e24"
        />
        <polygon
          points="44.23 100 44 50 0 25.839 0 74.664 44.23 100"
          opacity="0.25179"
          style={{ isolation: 'isolate' }}
        />
        <polygon
          points="27 41.077 44.089 31 61 41.077 61 60.128 44.089 70 27 60.128 27 41.077"
          fill="#fff"
        />
        <polygon points="44 31 61 41.077 61 60.128 44 50 44 31" fill="#d8d8d8" />
        <polygon points="27 60.128 27 41.077 44 31 44 50 27 60.128" fill="#959595" />
        <polygon
          points="0 25.839 44.23 0 88 25.839 88 74.688 44.23 100 0 74.688 0 25.839"
          opacity="0.75"
          fill={`url(#${PaintServerIds.runningTriggerCube})`}
          style={{ isolation: 'isolate' }}
        />
        <polygon
          points="88 25.839 44.23 0 0 25.839 44 50 88 25.839"
          fill="#fff"
          opacity="0.13893"
          style={{ isolation: 'isolate' }}
        />
        <polygon
          points="44.23 100 44 50 0 25.839 0 74.664 44.23 100"
          opacity="0.25179"
          style={{ isolation: 'isolate' }}
        />
      </g>
    </symbol>
    <symbol viewBox="0 0 88 100" id={SymbolIds.terminatedProcessCube}>
      <title>Terminated Process</title>
      <g>
        <polygon
          points="0 25.839 44.23 0 88 25.839 88 74.688 44.23 100 0 74.688 0 25.839"
          fill="#1d1e24"
        />
        <polygon
          points="44.23 100 44 50 0 25.839 0 74.664 44.23 100"
          opacity="0.25179"
          style={{ isolation: 'isolate' }}
        />
        <polygon
          id="Path-4-Copy-15"
          points="0 25.839 44.23 0 88 25.839 88 74.688 44.23 100 0 74.688 0 25.839"
          opacity="0.35"
          fill={`url(#${PaintServerIds.terminatedProcessCube})`}
          style={{ isolation: 'isolate' }}
        />
        <polygon
          id="Path-Copy-20"
          points="88 25.839 44.23 0 0 25.839 44 50 88 25.839"
          fill="#fff"
          opacity="0.13893"
          style={{ isolation: 'isolate' }}
        />
        <polygon
          id="Path-Copy-21"
          points="44.23 100 44 50 0 25.839 0 74.664 44.23 100"
          opacity="0.25179"
          style={{ isolation: 'isolate' }}
        />
      </g>
    </symbol>
    <svg id={SymbolIds.terminatedTriggerCube} viewBox="0 0 88 100">
      <title>Terminated Trigger Process</title>
      <g>
        <polygon
          points="0 25.839 44.23 0 88 25.839 88 74.688 44.23 100 0 74.688 0 25.839"
          fill="#1d1e24"
        />
        <polygon
          points="44.23 100 44 50 0 25.839 0 74.664 44.23 100"
          opacity="0.25179"
          style={{ isolation: 'isolate' }}
        />
        <polygon
          points="0 25.839 44.23 0 88 25.839 88 74.688 44.23 100 0 74.688 0 25.839"
          opacity="0.35"
          fill={`url(#${PaintServerIds.terminatedTriggerCube})`}
          style={{ isolation: 'isolate' }}
        />
        <polygon
          points="88 25.839 44.23 0 0 25.839 44 50 88 25.839"
          fill="#fff"
          opacity="0.13893"
          style={{ isolation: 'isolate' }}
        />
        <polygon
          points="44.23 100 44 50 0 25.839 0 74.664 44.23 100"
          opacity="0.25179"
          style={{ isolation: 'isolate' }}
        />
      </g>
    </svg>
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
