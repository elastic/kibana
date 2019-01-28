/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultTo, get } from 'lodash/fp';
import React from 'react';

export const getEmptyTagValue = () => <>{getEmptyValue()}</>;

export const getEmptyValue = () => '--';

export const getOrEmptyTag = (path: string, item: unknown) => <>{getOrEmpty(path, item)}</>;

export const getOrEmpty = (path: string, item: unknown) =>
  get(path, item) != null ? get(path, item) : getEmptyValue();

export const defaultToEmptyTag = <T extends unknown>(item: T) => <>{defaultToEmpty(item)}</>;

export const defaultToEmpty = <T extends unknown>(item: T) => defaultTo(getEmptyValue(), item);
