/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore untyped local
import { resolveWithMissingImage } from '../../../common/lib/resolve_dataurl';
// @ts-ignore .png file
import { elasticOutline } from '../../lib/elastic_outline';
import { ContextFunction, Render } from '../types';
import { getFunctionHelp } from '../../strings';

export enum Origin {
  TOP = 'top',
  LEFT = 'left',
  BOTTOM = 'bottom',
  RIGHT = 'right',
}

interface Arguments {
  image: string | null;
  emptyImage: string | null;
  origin: Origin;
}

export function revealImage(): ContextFunction<
  'revealImage',
  number,
  Arguments,
  Render<Arguments>
> {
  const { help, args: argHelp } = getFunctionHelp().revealImage;

  return {
    name: 'revealImage',
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
      emptyImage: {
        types: ['string', 'null'],
        help: argHelp.emptyImage,
        default: null,
      },
      origin: {
        types: ['string'],
        help: argHelp.origin,
        default: 'bottom',
        options: Object.values(Origin),
      },
    },
    fn: (percent, args) => {
      if (percent > 1 || percent < 0) {
        throw new Error(`Invalid value: '${percent}'. Percentage must be between 0 and 1`);
      }

      return {
        type: 'render',
        as: 'revealImage',
        value: {
          percent,
          ...args,
          image: resolveWithMissingImage(args.image, elasticOutline),
          emptyImage: resolveWithMissingImage(args.emptyImage),
        },
      };
    },
  };
}
