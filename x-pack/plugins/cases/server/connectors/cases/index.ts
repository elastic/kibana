/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertingConnectorFeatureId,
  SecurityConnectorFeatureId,
  UptimeConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ConnectorAdapter } from '@kbn/alerting-plugin/server';
import { CasesConnector } from './cases_connector';
import { DEFAULT_MAX_OPEN_CASES } from './constants';
import { CASES_CONNECTOR_ID, CASES_CONNECTOR_TITLE } from '../../../common/constants';
import type {
  CasesConnectorConfig,
  CasesConnectorParams,
  CasesConnectorRuleActionParams,
  CasesConnectorSecrets,
} from './types';
import {
  CasesConnectorConfigSchema,
  CasesConnectorRuleActionParamsSchema,
  CasesConnectorSecretsSchema,
} from './schema';
import type { CasesClient } from '../../client';
import { constructRequiredKibanaPrivileges } from './utils';

interface GetCasesConnectorTypeArgs {
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>;
  getUnsecuredSavedObjectsClient: (
    request: KibanaRequest,
    savedObjectTypes: string[]
  ) => Promise<SavedObjectsClientContract>;
  getSpaceId: (request?: KibanaRequest) => string;
}

export const getCasesConnectorType = ({
  getCasesClient,
  getSpaceId,
  getUnsecuredSavedObjectsClient,
}: GetCasesConnectorTypeArgs): SubActionConnectorType<
  CasesConnectorConfig,
  CasesConnectorSecrets
> => ({
  id: CASES_CONNECTOR_ID,
  name: CASES_CONNECTOR_TITLE,
  getService: (params) =>
    new CasesConnector({
      casesParams: { getCasesClient, getSpaceId, getUnsecuredSavedObjectsClient },
      connectorParams: params,
    }),
  schema: {
    config: CasesConnectorConfigSchema,
    secrets: CasesConnectorSecretsSchema,
  },
  /**
   * TODO: Limit only to rule types that support
   * alerts-as-data
   */
  supportedFeatureIds: [
    SecurityConnectorFeatureId,
    UptimeConnectorFeatureId,
    AlertingConnectorFeatureId,
  ],
  /**
   * TODO: Verify license
   */
  minimumLicenseRequired: 'platinum' as const,
  isSystemActionType: true,
  getKibanaPrivileges: ({ params } = { params: { subAction: 'run', subActionParams: {} } }) => {
    const owner = params?.subActionParams?.owner as string;

    if (!owner) {
      throw new Error('Cannot authorize cases. Owner is not defined in the subActionParams.');
    }

    return constructRequiredKibanaPrivileges(owner);
  },
});

export const getCasesConnectorAdapter = (): ConnectorAdapter<
  CasesConnectorRuleActionParams,
  CasesConnectorParams
> => {
  return {
    connectorTypeId: CASES_CONNECTOR_ID,
    ruleActionParamsSchema: CasesConnectorRuleActionParamsSchema,
    buildActionParams: ({ alerts, rule, params, spaceId, ruleUrl }) => {
      const caseAlerts = [...alerts.new.data, ...alerts.ongoing.data];

      const subActionParams = {
        alerts: caseAlerts,
        rule: { id: rule.id, name: rule.name, tags: rule.tags, ruleUrl: ruleUrl ?? null },
        groupingBy: params.subActionParams.groupingBy,
        owner: params.subActionParams.owner,
        reopenClosedCases: params.subActionParams.reopenClosedCases,
        timeWindow: params.subActionParams.timeWindow,
        maximumCasesToOpen: DEFAULT_MAX_OPEN_CASES,
      };

      return { subAction: 'run', subActionParams };
    },
  };
};
