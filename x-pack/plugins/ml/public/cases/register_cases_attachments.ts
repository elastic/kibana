/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesUiSetup } from '@kbn/cases-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { registerAnomalyChartsCasesAttachment } from './register_anomaly_charts_attachment';
import { MlStartDependencies } from '../plugin';
import { registerAnomalySwimLaneCasesAttachment } from './register_anomaly_swim_lane_attachment';

export function registerCasesAttachments(
  cases: CasesUiSetup,
  coreStart: CoreStart,
  pluginStart: MlStartDependencies
) {
  registerAnomalySwimLaneCasesAttachment(cases, coreStart, pluginStart);
  registerAnomalyChartsCasesAttachment(cases, coreStart, pluginStart);
}
