/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SavedObject } from '../../../../src/core/server';

export type MapSavedObjectAttributes = {
  title?: string;
  description?: string;
  mapStateJSON?: string;
  layerListJSON?: string;
  uiStateJSON?: string;
  bounds?: {
    type?: string;
    coordinates?: [];
  };
};

export type MapSavedObject = SavedObject<MapSavedObjectAttributes>;
