/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { GetEventValue, GetFieldValue } from '../types';

export const getEventValue: GetEventValue = (event, path) => {
  const value = get(event, `_source.${path}`) || event?._source?.[path];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

export const getFieldValue: GetFieldValue = (event, path) => get(event?.fields, path)?.[0];
