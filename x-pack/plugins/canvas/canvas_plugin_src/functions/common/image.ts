/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { getFunctionHelp, getFunctionErrors } from '../../../i18n';

// @ts-expect-error untyped local
import { resolveWithMissingImage } from '../../../common/lib/resolve_dataurl';
import { elasticLogo } from '../../lib/elastic_logo';

export enum ImageMode {
  CONTAIN = 'contain',
  COVER = 'cover',
  STRETCH = 'stretch',
}

interface Arguments {
  dataurl: string | null;
  mode: ImageMode | null;
}

export interface Return {
  type: 'image';
  mode: string;
  dataurl: string;
}

export function image(): ExpressionFunctionDefinition<'image', null, Arguments, Return> {
  const { help, args: argHelp } = getFunctionHelp().image;
  const errors = getFunctionErrors().image;

  return {
    name: 'image',
    aliases: [],
    type: 'image',
    inputTypes: ['null'],
    help,
    args: {
      dataurl: {
        // This was accepting dataurl, but there was no facility in fn for checking type and handling a dataurl type.
        types: ['string', 'null'],
        help: argHelp.dataurl,
        aliases: ['_', 'url'],
        default: elasticLogo,
      },
      mode: {
        types: ['string'],
        help: argHelp.mode,
        default: 'contain',
        options: Object.values(ImageMode),
      },
    },
    fn: (input, { dataurl, mode }) => {
      if (!mode || !Object.values(ImageMode).includes(mode)) {
        throw errors.invalidImageMode();
      }

      const modeStyle = mode === 'stretch' ? '100% 100%' : mode;

      return {
        type: 'image',
        mode: modeStyle,
        dataurl: resolveWithMissingImage(dataurl, elasticLogo),
      };
    },
  };
}
