/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const increaseIgnoreAboveMitigationRT = rt.strict({
  type: rt.literal('mapping-increase-ignore-above'),
  data_stream: rt.string,
  field: rt.string,
});

export const truncateValueMitigationRT = rt.strict({
  type: rt.literal('pipeline-truncate-value'),
  data_stream: rt.string,
  field: rt.string,
});

export const removeFieldMitigationRT = rt.strict({
  type: rt.literal('pipeline-remove-field'),
  data_stream: rt.string,
  field: rt.string,
});

export const mitigationRT = rt.union([
  increaseIgnoreAboveMitigationRT,
  truncateValueMitigationRT,
  removeFieldMitigationRT,
]);
