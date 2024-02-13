/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type HasType, apiIsOfType } from '@kbn/presentation-publishing';
import type { ILayer } from '../classes/layers/layer';


export type HasMapConfig = HasType<'map'> & {
  getLayerList: () => ILayer[];
};

export const apiHasMapConfig = (api: unknown): api is HasMapConfig => {
  return Boolean(
    api && apiIsOfType(api, 'map') && typeof (api as HasMapConfig).getLayerList === 'function'
  );
};
