/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import {
  elasticOutline,
  resolveWithMissingImage,
} from '../../../../../../src/plugins/presentation_util/common';
import { Render } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  image: string | null;
  size: number;
  max: number;
  emptyImage: string | null;
}

export interface Return {
  count: number;
  image: string;
  size: number;
  max: number;
  emptyImage: string | null;
}

export function repeatImage(): ExpressionFunctionDefinition<
  'repeatImage',
  number,
  Arguments,
  Render<Arguments>
> {
  const { help, args: argHelp } = getFunctionHelp().repeatImage;

  return {
    name: 'repeatImage',
    aliases: [],
    type: 'render',
    inputTypes: ['number'],
    help,
    args: {
      emptyImage: {
        types: ['string', 'null'],
        help: argHelp.emptyImage,
        default: null,
      },
      image: {
        types: ['string', 'null'],
        help: argHelp.image,
        default: elasticOutline,
      },
      max: {
        types: ['number'],
        help: argHelp.max,
        default: 1000,
      },
      size: {
        types: ['number'],
        default: 100,
        help: argHelp.size,
      },
    },
    fn: (count, args) => {
      return {
        type: 'render',
        as: 'repeatImage',
        value: {
          count: Math.floor(count),
          ...args,
          image: resolveWithMissingImage(args.image, elasticOutline),
          emptyImage: resolveWithMissingImage(args.emptyImage),
        },
      };
    },
  };
}
