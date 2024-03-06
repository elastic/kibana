/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey, ICMPFields } from '../../../../common/runtime_types';
import { secondsToCronFormatter } from '../formatting_utils';
import { Formatter, commonFormatters } from './common';

export type ICMPFormatMap = Record<keyof ICMPFields, Formatter>;
export const icmpFormatters: ICMPFormatMap = {
  ...commonFormatters,
  [ConfigKey.HOSTS]: null,
  [ConfigKey.WAIT]: secondsToCronFormatter,
  [ConfigKey.MODE]: null,
  [ConfigKey.IPV4]: null,
  [ConfigKey.IPV6]: null,
};
