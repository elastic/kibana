/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment, { ISO_8601 } from 'moment';
import type { SearchTypes } from '../../../../../../../common/detection_engine/types';
import { isValidNumericType } from './is_valid_numeric_type';

// ECS mapping date format is default optional strict-date-time and epoch ms time: "strict_date_optional_time||epoch_millis"
// https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-date-format.html#strict-date-time
const additionalFormats = [
  'yyyy-MM-DDT', // is valid for ES but not for moment's ISO_8601
];

/**
 * validates ES date type
 */
export const isValidDateType = (date: SearchTypes): boolean => {
  // any number or string that can be parsed as valid number is a valid date for ES
  if (isValidNumericType(date)) {
    return true;
  }

  if (typeof date !== 'string') {
    return false;
  }

  return moment(date, [ISO_8601, ...additionalFormats], true).isValid();
};
