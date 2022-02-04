/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { MigrateFunctionsObject } from '../../../../../src/plugins/kibana_utils/common';
import { MapSavedObjectAttributes } from '../map_saved_object_type';

/**
 * This creates a migration map that applies filter migrations to Maps
 */
export const getMapFilterMigrations = (
  filterMigrations: MigrateFunctionsObject
): MigrateFunctionsObject =>
  mapValues(filterMigrations, (migrate) => (doc: { attributes: MapSavedObjectAttributes }) => ({
    ...doc,
    attributes: {
      ...doc.attributes,
      // state: { ...lensDoc.attributes.state, filters: migrate(lensDoc.attributes.state.filters) },
    },
  }));
