/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Available versions for the upgrade of the Elastic Agent
// These versions are only intended to be used as a fallback
// in the event that the updated versions cannot be retrieved from the endpoint

export const FALLBACK_VERSIONS = [
  '8.2.0',
  '8.1.3',
  '8.1.2',
  '8.1.1',
  '8.1.0',
  '8.0.1',
  '8.0.0',
  '7.9.3',
  '7.9.2',
  '7.9.1',
  '7.9.0',
  '7.8.1',
  '7.8.0',
  '7.17.3',
  '7.17.2',
  '7.17.1',
  '7.17.0',
];

export const MAINTAINANCE_VALUES = [1, 2, 4, 8, 12, 24, 48];
