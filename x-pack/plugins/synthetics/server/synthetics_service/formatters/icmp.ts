/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { icmpFormatters as basicICMPFormatters } from '../../../common/formatters/icmp/formatters';
import { Formatter, commonFormatters } from './common';
import { ICMPFields } from '../../../common/runtime_types/monitor_management';

export type ICMPFormatMap = Record<keyof ICMPFields, Formatter>;
export const icmpFormatters: ICMPFormatMap = {
  ...commonFormatters,
  ...basicICMPFormatters,
};
