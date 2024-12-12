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
import { EdrForSecurityConnectorFeatureId, SubFeatureType } from '@kbn/actions-plugin/common';
import { urlAllowListValidator, ActionExecutionSourceType } from '@kbn/actions-plugin/server';
import {
  EDR_EXECUTE_PRIVILEGE,
  EDR_SUB_ACTIONS_EXECUTE_PRIVILEGE,
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
  subFeatureType: SubFeatureType.EDR,
  getKibanaPrivileges: (args) => {
    const privileges = [EDR_EXECUTE_PRIVILEGE];
    if (
      args?.source === ActionExecutionSourceType.HTTP_REQUEST &&
      args?.params?.subAction !== SUB_ACTION.GET_AGENTS
    ) {
      privileges.push(EDR_SUB_ACTIONS_EXECUTE_PRIVILEGE);
    }
    return privileges;
  },
});
