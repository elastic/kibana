/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ContextFunction, Render, ContainerStyle } from '../types';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  as: string | null;
  css: string | null;
  containerStyle: ContainerStyle | null;
}

export function render(): ContextFunction<'render', Render<any>, Arguments, Render<Arguments>> {
  const { help, args: argHelp } = getFunctionHelp().render;

  return {
    name: 'render',
    aliases: [],
    type: 'render',
    help,
    context: {
      types: ['render'],
    },
    args: {
      as: {
        types: ['string', 'null'],
        help: argHelp.as,
        options: ['debug', 'error', 'image', 'pie', 'plot', 'shape', 'table', 'text'],
      },
      css: {
        types: ['string', 'null'],
        default: '"* > * {}"',
        help: argHelp.css,
      },
      containerStyle: {
        types: ['containerStyle', 'null'],
        help: argHelp.containerStyle,
      },
    },
    fn: (context, args) => {
      return {
        ...context,
        as: args.as || context.as,
        css: args.css,
        containerStyle: args.containerStyle,
      };
    },
  };
}
