/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { NullContextFunction } from '../types';
import { getFunctionHelp } from '../../strings';

const name = 'seriesStyle';

interface Arguments {
  bars: number;
  color: string | null;
  fill: number | boolean;
  horizontalBars: boolean;
  label: string;
  lines: number;
  points: number;
  stack: number | null;
}

interface Return extends Arguments {
  type: 'seriesStyle';
}

export function seriesStyle(): NullContextFunction<'seriesStyle', Arguments, Return> {
  const { help, args: argHelp } = getFunctionHelp().seriesStyle;

  return {
    name,
    help,
    context: {
      types: ['null'],
    },
    args: {
      label: {
        types: ['string'],
        help: argHelp.label,
      },
      color: {
        types: ['string', 'null'],
        help: argHelp.color,
      },
      lines: {
        types: ['number'],
        help: argHelp.lines,
      },
      bars: {
        types: ['number'],
        help: argHelp.bars,
      },
      points: {
        types: ['number'],
        help: argHelp.points,
      },
      fill: {
        types: ['number', 'boolean'],
        help: argHelp.fill,
        default: false,
        options: [true, false],
      },
      stack: {
        types: ['number', 'null'],
        help: argHelp.stack,
      },
      horizontalBars: {
        types: ['boolean'],
        help: argHelp.horizontalBars,
        options: [true, false],
      },
    },
    fn: (_context, args) => ({ type: name, ...args }),
  };
}
