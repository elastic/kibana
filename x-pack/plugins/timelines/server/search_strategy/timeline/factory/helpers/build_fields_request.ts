/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash/fp';
import { TIMELINE_EVENTS_FIELDS } from './constants';

export const buildFieldsRequest = (fields: string[], excludeEcsData?: boolean) =>
  uniq([
    ...fields.filter((field) => !field.startsWith('_')),
    ...(excludeEcsData ? [] : TIMELINE_EVENTS_FIELDS),
  ]).map((field) => ({
    field,
    include_unmapped: true,
  }));
