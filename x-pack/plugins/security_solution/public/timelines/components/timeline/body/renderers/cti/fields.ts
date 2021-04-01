/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const threatMatchFields = [
  'threat.indicator.matched.atomic',
  'threat.indicator.matched.field',
  'threat.indicator.matched.type',
];

export const requiredFields = [
  'threat.indicator.event.dataset',
  'threat.indicator.event.reference',
  'threat.indicator.provider',
  ...threatMatchFields,
];
