/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunctionDefinition, ExpressionValueRender } from 'src/plugins/expressions';
// @ts-expect-error untyped local
import { resolveWithMissingImage } from '../../../common/lib/resolve_dataurl';
// @ts-expect-error .png file
import { elasticOutline } from '../../lib/elastic_outline';
import { getFunctionHelp, getFunctionErrors } from '../../../i18n';

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

export function revealImage(): ExpressionFunctionDefinition<
  'revealImage',
  number,
  Arguments,
  ExpressionValueRender<Arguments>
> {
  const { help, args: argHelp } = getFunctionHelp().revealImage;
  const errors = getFunctionErrors().revealImage;

  return {
    name: 'revealImage',
    aliases: [],
    type: 'render',
    inputTypes: ['number'],
    help,
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
        throw errors.invalidPercent(percent);
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
