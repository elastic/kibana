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
import { EdrForSecurityConnectorFeatureId } from '@kbn/actions-plugin/common';
import { urlAllowListValidator, ActionExecutionSourceType } from '@kbn/actions-plugin/server';
import {
  CONNECTORS_EDR_EXECUTE_PRIVILEGE,
  SUB_ACTIONS_EDR__EXECUTE_PRIVILEGE,
} from '@kbn/actions-plugin/server/feature';
import { SENTINELONE_CONNECTOR_ID, SENTINELONE_TITLE } from '../../../common/sentinelone/constants';
import { SUB_ACTION } from '../../../common/sentinelone/constants';

import {
  SentinelOneConfigSchema,
  SentinelOneSecretsSchema,
} from '../../../common/sentinelone/schema';
import { SentinelOneConfig, SentinelOneSecrets } from '../../../common/sentinelone/types';
import { SentinelOneConnector } from './sentinelone';
import { renderParameterTemplates } from './render';

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
  supportedFeatureIds: [EdrForSecurityConnectorFeatureId],
  minimumLicenseRequired: 'enterprise' as const,
  renderParameterTemplates,
  isEdrActionType: true,
  getKibanaPrivileges: (args) => {
    const privileges = [CONNECTORS_EDR_EXECUTE_PRIVILEGE];
    if (
      args?.source === ActionExecutionSourceType.HTTP_REQUEST &&
      args?.params?.subAction !== SUB_ACTION.GET_AGENTS
    ) {
      privileges.push(SUB_ACTIONS_EDR__EXECUTE_PRIVILEGE);
    }
    return privileges;
  },
});
