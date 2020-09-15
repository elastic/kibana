/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from './models_list';

export enum ModelsTableToConfigMapping {
  id = 'model_id',
  createdAt = 'create_time',
  type = 'type',
}
