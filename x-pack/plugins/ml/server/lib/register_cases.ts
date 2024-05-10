/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { CasesServerSetup } from '@kbn/cases-plugin/server';
import type { MlFeatures } from '../../common/constants/app';
import {
  CASE_ATTACHMENT_TYPE_ID_ANOMALY_EXPLORER_CHARTS,
  CASE_ATTACHMENT_TYPE_ID_ANOMALY_SWIMLANE,
} from '../../common/constants/cases';

export function registerCasesPersistableState(
  cases: CasesServerSetup,
  enabledFeatures: MlFeatures,
  logger: Logger
) {
  if (enabledFeatures.ad === true) {
    try {
      cases.attachmentFramework.registerPersistableState({
        id: CASE_ATTACHMENT_TYPE_ID_ANOMALY_SWIMLANE,
      });
    } catch (error) {
      logger.warn(
        `ML failed to register cases persistable state for ${CASE_ATTACHMENT_TYPE_ID_ANOMALY_SWIMLANE}`
      );
    }
    try {
      cases.attachmentFramework.registerPersistableState({
        id: CASE_ATTACHMENT_TYPE_ID_ANOMALY_EXPLORER_CHARTS,
      });
    } catch (error) {
      logger.warn(
        `ML failed to register cases persistable state for ${CASE_ATTACHMENT_TYPE_ID_ANOMALY_EXPLORER_CHARTS}`
      );
    }
  }
}
