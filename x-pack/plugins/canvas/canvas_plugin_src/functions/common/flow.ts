/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionDefinition } from 'src/plugins/expressions';
import { getFunctionHelp } from '../../../i18n';

export enum Shape {
  ARROW = 'arrow',
  ARROW_MULTI = 'arrowMulti',
  LINE_ELBOW_UP = 'lineElbowUp',
  LINE_ELBOW_DOWN = 'lineElbowDown',
  LINE_STRAIGHT_UP = 'lineStraightUp',
  LINE_STRAIGHT_DOWN = 'lineStraightDown',
  LINE_SMOOTH_UP = 'lineSmoothUp',
  LINE_SMOOTH_DOWN = 'lineSmoothDown',
  LINE_HORIZONTAL = 'lineHorizontal',
  LINE_VERTICAL = 'lineVertical',
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

export interface Output extends Arguments {
  type: 'flow';
}

export function flow(): ExpressionFunctionDefinition<'flow', null, Arguments, Output> {
  const { help, args: argHelp } = getFunctionHelp().flow;

  return {
    name: 'flow',
    aliases: [],
    type: 'flow',
    inputTypes: ['null'],
    help,
    args: {
      shape: {
        types: ['string'],
        help: argHelp.shape,
        aliases: ['_'],
        default: 'square',
        options: Object.values(Shape),
      },
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
    fn: (input, args) => ({
      type: 'flow',
      ...args,
    }),
  };
}
