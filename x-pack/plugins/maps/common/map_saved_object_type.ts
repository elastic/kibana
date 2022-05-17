/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */
import type { SimpleSavedObject } from '@kbn/core/public';

export type MapSavedObjectAttributes = {
  title: string;
  description?: string;
  mapStateJSON?: string;
  layerListJSON?: string;
  uiStateJSON?: string;
};

export type MapSavedObject = SimpleSavedObject<MapSavedObjectAttributes>;
