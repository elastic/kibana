/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/server';
import { AlertingSetup } from '../../types';
import { getRuleType } from './rule_type';

interface RegisterParams {
  alerting: AlertingSetup;
  core: CoreSetup;
}

export function register(params: RegisterParams) {
  const { alerting, core } = params;
  alerting.registerType(getRuleType(core));
}
