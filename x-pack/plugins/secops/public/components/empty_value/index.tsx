/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultTo, get } from 'lodash/fp';

export const getEmptyValue = () => '--';

export const getOrEmpty = (path: string, item: unknown) =>
  get(path, item) != null ? get(path, item) : getEmptyValue();

export const defaultToEmpty = <T extends unknown>(item: T) => defaultTo(getEmptyValue(), item);
