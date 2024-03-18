/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
  StartServicesAccessor,
} from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { i18n } from '@kbn/i18n';
import type { EntityAnalyticsPrivileges } from '../../../../common/api/entity_analytics/common';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import {
  RISK_ENGINE_REQUIRED_ES_CLUSTER_PRIVILEGES,
  RISK_ENGINE_REQUIRED_ES_INDEX_PRIVILEGES,
  getMissingRiskEnginePrivileges,
} from '../../../../common/entity_analytics/risk_engine';
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

export const _getMissingPrivilegesMessage = (riskEnginePrivileges: EntityAnalyticsPrivileges) => {
  const { indexPrivileges, clusterPrivileges } = getMissingRiskEnginePrivileges(
    riskEnginePrivileges.privileges
  );

  const indexPrivilegesMessage = indexPrivileges
    .map(([indexName, privileges]) =>
      i18n.translate('xpack.securitySolution.entityAnalytics.riskEngine.missingIndexPrivilege', {
        defaultMessage: 'Missing index privileges for index "{indexName}": {privileges}.',
        values: {
          indexName,
          privileges: privileges.join(', '),
        },
      })
    )
    .join('\n');

  const clusterPrivilegesMessage = !clusterPrivileges.length
    ? ''
    : i18n.translate('xpack.securitySolution.entityAnalytics.riskEngine.missingClusterPrivilege', {
        defaultMessage: 'Missing cluster privileges: {privileges}.',
        values: {
          privileges: clusterPrivileges.join(', '),
        },
      });

  const unauthorizedMessage = i18n.translate(
    'xpack.securitySolution.entityAnalytics.riskEngine.unauthorized',
    {
      defaultMessage: 'User is missing risk engine privileges.',
    }
  );

  return `${unauthorizedMessage} ${indexPrivilegesMessage} ${clusterPrivilegesMessage}`;
};

/**
 * This function is used to check if the user has the required privileges to access the risk engine.
 * It is used to wrap a risk engine route handler which requires full access to the risk engine.
 * @param getStartServices - Kibana's start services accessor
 * @param handler - The route handler to wrap
 **/
export const withRiskEnginePrivilegeCheck = (
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies, unknown>,
  handler: (
    context: SecuritySolutionRequestHandlerContext,
    request: KibanaRequest,
    response: KibanaResponseFactory
  ) => Promise<IKibanaResponse>
) => {
  return async (
    context: SecuritySolutionRequestHandlerContext,
    request: KibanaRequest,
    response: KibanaResponseFactory
  ) => {
    const [_, { security }] = await getStartServices();
    const privileges = await getUserRiskEnginePrivileges(request, security);
    if (!privileges.has_all_required) {
      const siemResponse = buildSiemResponse(response);
      return siemResponse.error({
        statusCode: 403,
        body: _getMissingPrivilegesMessage(privileges),
      });
    }
    return handler(context, request, response);
  };
};
