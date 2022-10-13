/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import { removeAttributesId } from './remove_attributes_id';
import { CanvasSavedObjectTypeMigrationsDeps } from './types';

export const workpadMigrationsFactory = (deps: CanvasSavedObjectTypeMigrationsDeps) =>
  ({
    '7.0.0': removeAttributesId,
  } as unknown as MigrateFunctionsObject);
