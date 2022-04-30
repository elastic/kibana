/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './models_list';

export const ModelsTableToConfigMapping = {
  id: 'model_id',
  description: 'description',
  createdAt: 'create_time',
  type: 'type',
  modelType: 'model_type',
} as const;
