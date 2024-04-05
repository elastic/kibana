/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { SecurityConnectorFeatureId } from '@kbn/actions-plugin/common';
import { CROWDSTRIKE_CONNECTOR_ID, CROWDSTRIKE_TITLE } from '../../../common/crowdstrike/constants';
import {
  CrowdstrikeConfigSchema,
  CrowdstrikeSecretsSchema,
} from '../../../common/crowdstrike/schema';
import { CrowdstrikeConfig, CrowdstrikeSecrets } from '../../../common/crowdstrike/types';
import { CrowdstrikeConnector } from './crowdstrike';

export const getCrowdstrikeConnectorType = (): SubActionConnectorType<
  CrowdstrikeConfig,
  CrowdstrikeSecrets
> => ({
  id: CROWDSTRIKE_CONNECTOR_ID,
  name: CROWDSTRIKE_TITLE,
  getService: (params) => new CrowdstrikeConnector(params),
  schema: {
    config: CrowdstrikeConfigSchema,
    secrets: CrowdstrikeSecretsSchema,
  },
  supportedFeatureIds: [SecurityConnectorFeatureId],
  minimumLicenseRequired: 'enterprise' as const,
});
