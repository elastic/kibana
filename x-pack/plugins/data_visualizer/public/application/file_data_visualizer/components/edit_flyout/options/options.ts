/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FILE_FORMATS } from '../../../../../../common/constants';

import {
  TIMESTAMP_OPTIONS,
  DELIMITER_OPTIONS,
  QUOTE_OPTIONS,
  CHARSET_OPTIONS,
} from './option_lists';

function getOptions(list: string[]) {
  return list.map((o) => ({ label: o }));
}

export function getFormatOptions() {
  return getOptions(Object.values(FILE_FORMATS));
}

export function getTimestampFormatOptions() {
  return getOptions(TIMESTAMP_OPTIONS);
}

export function getDelimiterOptions() {
  return getOptions(DELIMITER_OPTIONS);
}

export function getQuoteOptions() {
  return getOptions(QUOTE_OPTIONS);
}

export function getCharsetOptions() {
  return getOptions(CHARSET_OPTIONS);
}
