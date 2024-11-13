/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '@kbn/alerting-plugin/common';
import type { TopAlert } from '@kbn/observability-plugin/public';
import type { BurnRateRuleParams } from '../../typings/slo';
export type { TimeRange } from '../slo/error_rate_chart/use_lens_definition';

export type BurnRateRule = Rule<BurnRateRuleParams>;
export type BurnRateAlert = TopAlert;
