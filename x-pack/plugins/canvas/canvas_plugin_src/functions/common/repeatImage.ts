/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
// @ts-ignore untyped local
import { resolveWithMissingImage } from '../../../common/lib/resolve_dataurl';
// @ts-ignore .png file
import { elasticOutline } from '../../lib/elastic_outline';
import { Render } from '../types';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  image: string | null;
  size: number;
  max: number;
  emptyImage: string | null;
}

export function repeatImage(): ExpressionFunction<
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
    help,
    context: {
      types: ['number'],
    },
    args: {
      image: {
        types: ['string', 'null'],
        help: argHelp.image,
        default: elasticOutline,
      },
      size: {
        types: ['number'],
        default: 100,
        help: argHelp.size,
      },
      max: {
        types: ['number'],
        help: argHelp.max,
        default: 1000,
      },
      emptyImage: {
        types: ['string', 'null'],
        help: argHelp.emptyImage,
        default: null,
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
