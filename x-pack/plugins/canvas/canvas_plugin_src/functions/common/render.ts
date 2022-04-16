/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { ExpressionValueRender, ContainerStyle } from '../../../types';
import { getFunctionHelp } from '../../../i18n';
import { DEFAULT_ELEMENT_CSS } from '../../../common/lib/constants';

interface ContainerStyleArgument extends ContainerStyle {
  type: 'containerStyle';
}

interface Arguments {
  as: string;
  css: string;
  containerStyle: ContainerStyleArgument;
}

export type Renderable = ExpressionValueRender<Arguments> & Arguments;

export function render(): ExpressionFunctionDefinition<
  'render',
  ExpressionValueRender<any>,
  Arguments,
  ExpressionValueRender<Arguments>
> {
  const { help, args: argHelp } = getFunctionHelp().render;

  return {
    name: 'render',
    aliases: [],
    type: 'render',
    inputTypes: ['render'],
    help,
    args: {
      as: {
        types: ['string'],
        help: argHelp.as,
        options: [
          'advanced_filter',
          'debug',
          'dropdown_filter',
          'error',
          'image',
          'markdown',
          'metric',
          'pie',
          'plot',
          'progress',
          'repeatImage',
          'shape',
          'table',
          'time_filter',
          'text',
        ],
      },
      css: {
        types: ['string'],
        help: argHelp.css,
        default: `"${DEFAULT_ELEMENT_CSS}"`,
      },
      containerStyle: {
        types: ['containerStyle'],
        help: argHelp.containerStyle,
        default: '{containerStyle}',
      },
    },
    fn: (input, args) => {
      return {
        ...input,
        as: args.as || input.as,
        css: args.css || DEFAULT_ELEMENT_CSS,
        containerStyle: args.containerStyle,
      };
    },
  };
}
