/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesPublicSetup } from '@kbn/cases-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { registerAnomalyChartsCasesAttachment } from './register_anomaly_charts_attachment';
import type { MlStartDependencies } from '../plugin';
import { registerAnomalySwimLaneCasesAttachment } from './register_anomaly_swim_lane_attachment';

export function registerCasesAttachments(
  cases: CasesPublicSetup,
  coreStart: CoreStart,
  pluginStart: MlStartDependencies
) {
  registerAnomalySwimLaneCasesAttachment(cases, pluginStart);
  registerAnomalyChartsCasesAttachment(cases, coreStart, pluginStart);
}
