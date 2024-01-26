/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Document } from '../../persistence';

export interface HasLensConfig {
  getSavedVis: () => Readonly<Document | undefined>;
}

export const apiHasLensConfig = (api: unknown): api is HasLensConfig => {
  return Boolean(api && typeof (api as HasLensConfig).getSavedVis === 'function');
};
