/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter } from '@kbn/es-query';
import { MapSavedObjectAttributes } from '../map_saved_object_type';
import { MigrateFunction } from '../../../../../src/plugins/kibana_utils/common';

export function migrateDataPersistedState(
  {
    attributes,
  }: {
    attributes: MapSavedObjectAttributes;
  },
  filterMigration: MigrateFunction<Filter[], Filter[]>
): MapSavedObjectAttributes {
  let mapState: { filters: Filter[] } = { filters: [] };
  if (attributes.mapStateJSON) {
    try {
      mapState = JSON.parse(attributes.mapStateJSON);
    } catch (e) {
      throw new Error('Unable to parse attribute mapStateJSON');
    }

    mapState.filters = filterMigration(mapState.filters);
  }

  return {
    ...attributes,
    mapStateJSON: JSON.stringify(mapState),
  };
}
