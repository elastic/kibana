/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ICMPFields, ConfigKeys } from '../types';
import { Formatter, commonFormatters, secondsToCronFormatter } from '../common/formatters';

export type ICMPFormatMap = Record<keyof ICMPFields, Formatter>;

export const icmpFormatters: ICMPFormatMap = {
  [ConfigKeys.HOSTS]: null,
  [ConfigKeys.WAIT]: (fields) => secondsToCronFormatter(fields[ConfigKeys.WAIT]),
  ...commonFormatters,
};
