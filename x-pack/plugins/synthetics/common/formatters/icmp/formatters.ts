/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { secondsToCronFormatter } from '../formatting_utils';
import { ICMPFields, ConfigKey } from '../../runtime_types/monitor_management';

import { Formatter, commonFormatters } from '../common/formatters';
import { stringToJsonFormatter } from '../formatting_utils';

export type ICMPFormatMap = Record<keyof ICMPFields, Formatter>;

export const icmpFormatters: ICMPFormatMap = {
  [ConfigKey.HOSTS]: stringToJsonFormatter,
  [ConfigKey.WAIT]: secondsToCronFormatter,
  [ConfigKey.MODE]: null,
  [ConfigKey.IPV4]: null,
  [ConfigKey.IPV6]: null,
  ...commonFormatters,
};
