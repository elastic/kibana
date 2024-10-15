/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';

import type { RootSchema } from '@kbn/core/public';
import type { TelemetryEventTypes } from '../../constants';

export interface PreviewRuleParams {
  ruleType: Type;
  loggedRequestsEnabled: boolean;
}

export interface PreviewRuleTelemetryEvent {
  eventType: TelemetryEventTypes.PreviewRule;
  schema: RootSchema<PreviewRuleParams>;
}
