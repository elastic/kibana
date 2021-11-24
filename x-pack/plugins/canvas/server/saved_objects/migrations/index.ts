/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { expressionsMigrationsFactory } from './expressions';
import { CanvasSavedObjectTypeMigrationsDeps } from './types';
import { workpadMigrationsFactory } from './workpad';
import { mergeMigrationFunctionMaps } from '../../../../../../src/plugins/kibana_utils/common';

export const migrationsFactory = (deps: CanvasSavedObjectTypeMigrationsDeps) =>
  mergeMigrationFunctionMaps(workpadMigrationsFactory(deps), expressionsMigrationsFactory(deps));

export type { CanvasSavedObjectTypeMigrationsDeps } from './types';
