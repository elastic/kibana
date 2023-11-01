/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SubActionConnectorType,
  ValidatorType,
} from '@kbn/actions-plugin/server/sub_action_framework/types';
import { SecurityConnectorFeatureId } from '@kbn/actions-plugin/common';
import { urlAllowListValidator } from '@kbn/actions-plugin/server';
import { PRIVILEGE_API_TAGS } from '@kbn/security-solution-features/app_features';
import {
  SENTINELONE_CONNECTOR_ID,
  SENTINELONE_TITLE,
  SUB_ACTION,
} from '../../../common/sentinelone/constants';
import {
  SentinelOneConfigSchema,
  SentinelOneSecretsSchema,
} from '../../../common/sentinelone/schema';
import { SentinelOneConfig, SentinelOneSecrets } from '../../../common/sentinelone/types';
import { SentinelOneConnector } from './sentinelone';
import { renderParameterTemplates } from './render';

const toApiTag = (tagName: string) => `api:${tagName}`;

export const getSentinelOneConnectorType = (): SubActionConnectorType<
  SentinelOneConfig,
  SentinelOneSecrets
> => ({
  id: SENTINELONE_CONNECTOR_ID,
  name: SENTINELONE_TITLE,
  getService: (params) => new SentinelOneConnector(params),
  schema: {
    config: SentinelOneConfigSchema,
    secrets: SentinelOneSecretsSchema,
  },
  validators: [{ type: ValidatorType.CONFIG, validator: urlAllowListValidator('url') }],
  supportedFeatureIds: [SecurityConnectorFeatureId],
  minimumLicenseRequired: 'enterprise' as const,
  renderParameterTemplates,
  getSubActionPrivileges: (params) => {
    const subActionName = params.subActionName as SUB_ACTION;

    switch (subActionName) {
      case SUB_ACTION.ISOLATE_AGENT:
      case SUB_ACTION.RELEASE_AGENT:
        return PRIVILEGE_API_TAGS.hostIsolationAll.map(toApiTag);

      case SUB_ACTION.KILL_PROCESS:
        return PRIVILEGE_API_TAGS.processOperationsAll.map(toApiTag);

      case SUB_ACTION.GET_AGENTS:
        return PRIVILEGE_API_TAGS.endpointListRead.map(toApiTag);

      case SUB_ACTION.GET_REMOTE_SCRIPT_RESULTS:
      case SUB_ACTION.GET_REMOTE_SCRIPT_STATUS:
        return PRIVILEGE_API_TAGS.responseActionsHistoryLogRead.map(toApiTag);
    }

    // trigger authz to fail since we don't recognize the sub-action name
    return [`unknown-sub-action-name-${subActionName}`];
  },
});
