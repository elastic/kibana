/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { getFunctionHelp } from '../../strings';

export enum Shape {
  ARROW = 'arrow',
  ARROW_MULTI = 'arrowMulti',
  BOOKMARK = 'bookmark',
  CIRCLE = 'circle',
  CROSS = 'cross',
  HEXAGON = 'hexagon',
  KITE = 'kite',
  PENTAGON = 'pentagon',
  RHOMBUS = 'rhombus',
  SEMICIRCLE = 'semicircle',
  SPEECH_BUBBLE = 'speechBubble',
  SQUARE = 'square',
  STAR = 'star',
  TAG = 'tag',
  TRIANGLE = 'triangle',
  TRIANGLE_RIGHT = 'triangleRight',
}

interface Arguments {
  border: string;
  borderWidth: number;
  shape: Shape;
  fill: string;
  maintainAspect: boolean;
}

interface Return extends Arguments {
  type: 'shape';
}

export function shape(): ExpressionFunction<'shape', null, Arguments, Return> {
  const { help, args: argHelp } = getFunctionHelp().shape;

  return {
    name: 'shape',
    aliases: [],
    type: 'shape',
    help,
    context: {
      types: ['null'],
    },
    args: {
      border: {
        types: ['string'],
        aliases: ['stroke'],
        help: argHelp.border,
      },
      borderWidth: {
        types: ['number'],
        aliases: ['strokeWidth'],
        help: argHelp.borderWidth,
        default: 0,
      },
      shape: {
        types: ['string'],
        help: argHelp.shape,
        aliases: ['_'],
        default: 'square',
        options: Object.values(Shape),
      },
      fill: {
        types: ['string'],
        help: argHelp.fill,
        default: 'black',
      },
      maintainAspect: {
        types: ['boolean'],
        help: argHelp.maintainAspect,
        default: false,
        options: [true, false],
      },
    },
    fn: (_context, args) => ({
      type: 'shape',
      ...args,
    }),
  };
}
