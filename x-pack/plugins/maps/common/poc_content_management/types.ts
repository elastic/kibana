/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsCreateOptions } from '@kbn/core-saved-objects-api-browser';
import type { CreateIn, GetIn } from '@kbn/content-management-plugin/common';

import { MapSavedObjectAttributes } from '../map_saved_object_type';

export type MapContentType = 'map';

export type MapGetIn = GetIn<MapContentType, { useSaveObjectResolve?: boolean }>;

export type MapCreateIn = CreateIn<
  MapContentType,
  MapSavedObjectAttributes,
  Pick<
    SavedObjectsCreateOptions,
    'migrationVersion' | 'coreMigrationVersion' | 'references' | 'overwrite'
  >
>;
