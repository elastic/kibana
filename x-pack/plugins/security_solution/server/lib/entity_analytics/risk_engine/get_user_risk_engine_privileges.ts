/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import {
  RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES,
  RISK_ENGINE_REQUIRED_ES_INDEX_PRIVILEGES,
} from '../../../../common/risk_engine';
import { checkAndFormatPrivileges } from '../utils/check_and_format_privileges';

export const getUserRiskEnginePrivileges = async (
  request: KibanaRequest,
  security: SecurityPluginStart
) => {
  return checkAndFormatPrivileges({
    request,
    security,
    privilegesToCheck: {
      elasticsearch: {
        cluster: RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES,
        index: RISK_ENGINE_REQUIRED_ES_INDEX_PRIVILEGES,
      },
    },
  });
};
