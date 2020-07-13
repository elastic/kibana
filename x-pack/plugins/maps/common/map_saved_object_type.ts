/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { SavedObject } from '../../../../src/core/types/saved_objects';

export type MapSavedObjectAttributes = {
  title?: string;
  description?: string;
  mapStateJSON?: string;
  layerListJSON?: string;
  uiStateJSON?: string;
};

export type MapSavedObject = SavedObject<MapSavedObjectAttributes>;
