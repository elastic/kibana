/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityConnectorFeatureId, UptimeConnectorFeatureId } from '@kbn/actions-plugin/common';
import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import type { KibanaRequest } from '@kbn/core-http-server';
import { CasesConnector } from './cases_connector';
import { CASES_CONNECTOR_ID, CASES_CONNECTOR_TITLE } from './constants';
import type { CasesConnectorConfig, CasesConnectorSecrets } from './types';
import { CasesConnectorConfigSchema, CasesConnectorSecretsSchema } from './schema';
import type { CasesClient } from '../../client';

interface GetCasesConnectorTypeArgs {
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>;
}

export const getCasesConnectorType = ({
  getCasesClient,
}: GetCasesConnectorTypeArgs): SubActionConnectorType<
  CasesConnectorConfig,
  CasesConnectorSecrets
> => ({
  id: CASES_CONNECTOR_ID,
  name: CASES_CONNECTOR_TITLE,
  getService: (params) =>
    new CasesConnector({ casesParams: { getCasesClient }, connectorParams: params }),
  schema: {
    config: CasesConnectorConfigSchema,
    secrets: CasesConnectorSecretsSchema,
  },
  /**
   * TODO: Limit only to rule types that support
   * alerts-as-data
   */
  supportedFeatureIds: [SecurityConnectorFeatureId, UptimeConnectorFeatureId],
  /**
   * TODO: Verify license
   */
  minimumLicenseRequired: 'platinum' as const,
});
