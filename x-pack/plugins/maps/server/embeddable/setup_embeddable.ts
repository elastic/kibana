/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import {
  mergeMigrationFunctionMaps,
  MigrateFunctionsObject,
} from '@kbn/kibana-utils-plugin/common';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import { extract, inject } from '../../common/embeddable';
import { embeddableMigrations } from './embeddable_migrations';
import { getPersistedStateMigrations } from '../saved_objects';

export function setupEmbeddable(
  embeddable: EmbeddableSetup,
  getFilterMigrations: () => MigrateFunctionsObject
) {
  embeddable.registerEmbeddableFactory({
    id: MAP_SAVED_OBJECT_TYPE,
    migrations: () => {
      return mergeMigrationFunctionMaps(
        embeddableMigrations,
        getPersistedStateMigrations(getFilterMigrations())
      );
    },
    inject,
    extract,
  });
}
