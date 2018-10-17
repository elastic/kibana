/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { injectI18n } from '@kbn/i18n/react';
import { getState } from '../state/store';
import { getAssetById } from '../state/selectors/assets';

const assetUI = intl => ({
  name: 'asset',
  aliases: [],
  context: {
    types: ['null'],
  },
  type: 'string',
  help: intl.formatMessage({
    id: 'xpack.canvas.functions.asset.useCanvasWorkpadAssetHelpText',
    defaultMessage: 'Use Canvas workpad asset objects to provide argument values. Usually images',
  }),
  args: {
    id: {
      aliases: ['_'],
      types: ['string'],
      help: intl.formatMessage({
        id: 'xpack.canvas.functions.asset.returnedAssetValueIdHelpText',
        defaultMessage: 'The ID of the asset value to return',
      }),
      multi: false,
    },
  },
  fn: (context, args) => {
    const assetId = args.id;
    const asset = getAssetById(getState(), assetId);
    if (asset !== undefined) return asset.value;

    throw new Error(
      intl.formatMessage(
        {
          id: 'xpack.canvas.functions.asset.couldNotGetAssetBySpecificIdErrorMessage',
          defaultMessage: 'Could not get the asset by ID: {assetId}',
        },
        {
          assetId,
        }
      )
    );
  },
});

export const asset = injectI18n(assetUI);
