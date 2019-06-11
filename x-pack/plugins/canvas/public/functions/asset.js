/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getState } from '../state/store';
import { getAssetById } from '../state/selectors/assets';

export const asset = () => ({
  name: 'asset',
  aliases: [],
  context: {
    types: ['null'],
  },
  type: 'string',
  help: 'Use Canvas workpad asset objects to provide argument values. Usually images',
  args: {
    id: {
      aliases: ['_'],
      types: ['string'],
      help: 'The ID of the asset value to return',
      multi: false,
      required: true,
    },
  },
  fn: (_context, args) => {
    const assetId = args.id;
    const asset = getAssetById(getState(), assetId);
    if (asset !== undefined) {
      return asset.value;
    }

    throw new Error('Could not get the asset by ID: ' + assetId);
  },
});
