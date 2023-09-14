/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesSetup } from '@kbn/cases-plugin/server';
import {
  CASE_ATTACHMENT_TYPE_ID_ANOMALY_EXPLORER_CHARTS,
  CASE_ATTACHMENT_TYPE_ID_ANOMALY_SWIMLANE,
} from '../../common/constants/cases';

export function registerCasesPersistableState(cases: CasesSetup) {
  cases.attachmentFramework.registerPersistableState({
    id: CASE_ATTACHMENT_TYPE_ID_ANOMALY_SWIMLANE,
  });

  cases.attachmentFramework.registerPersistableState({
    id: CASE_ATTACHMENT_TYPE_ID_ANOMALY_EXPLORER_CHARTS,
  });
}
