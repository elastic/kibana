/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const endpointDisallowedFields = [
  'file.Ext.quarantine_path',
  'file.Ext.quarantine_result',
  'process.entity_id',
  'process.parent.entity_id',
  'process.ancestry',
];
