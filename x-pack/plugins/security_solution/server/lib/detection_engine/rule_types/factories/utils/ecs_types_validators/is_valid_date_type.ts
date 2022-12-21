/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchTypes } from '../../../../../../../common/detection_engine/types';

/**
 * validates ES date type
 */
export const isValidDateType = (date: SearchTypes): boolean => {
  // multiple date formats and custom one, makes its difficult to verify date
  // https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-date-format.html#strict-date-time
  // so we enable 2 types only: string and number
  // so obvious mismatches as like object or array type or boolean will be excluded
  return typeof date === 'string' || typeof date === 'number';
};
