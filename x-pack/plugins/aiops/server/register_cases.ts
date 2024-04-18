/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { CasesServerSetup } from '@kbn/cases-plugin/server';
import { CASES_ATTACHMENT_CHANGE_POINT_CHART } from '@kbn/aiops-change-point-detection/constants';

export function registerCasesPersistableState(cases: CasesServerSetup | undefined, logger: Logger) {
  if (cases) {
    try {
      cases.attachmentFramework.registerPersistableState({
        id: CASES_ATTACHMENT_CHANGE_POINT_CHART,
      });
    } catch (error) {
      logger.warn(
        `AIOPs failed to register cases persistable state for ${CASES_ATTACHMENT_CHANGE_POINT_CHART}`
      );
    }
  }
}
