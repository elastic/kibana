/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';

/** Returns a settings key, typically used with local storage */
export const getSettingKey = ({
  category,
  page,
  setting,
}: {
  category: string;
  page: string;
  setting: string;
}): string => `${page}.${category}.${setting}`;

export const isDefaultWhenEmptyString = <T>(value: T): boolean =>
  typeof value !== 'string' || isEmpty(value.trim());
