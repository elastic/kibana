/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SubActionConnectorType,
  ValidatorType,
} from '@kbn/actions-plugin/server/sub_action_framework/types';
import {
  GenerativeAIForSecurityConnectorFeatureId,
  GenerativeAIForObservabilityConnectorFeatureId,
  GenerativeAIForSearchPlaygroundConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { urlAllowListValidator } from '@kbn/actions-plugin/server';
import { ValidatorServices } from '@kbn/actions-plugin/server/types';
import { assertURL } from '@kbn/actions-plugin/server/sub_action_framework/helpers/validators';
import {
  OPENAI_CONNECTOR_ID,
  OPENAI_TITLE,
  OpenAiProviderType,
} from '../../../common/openai/constants';
import { ConfigSchema, SecretsSchema } from '../../../common/openai/schema';
import { Config, Secrets } from '../../../common/openai/types';
import { OpenAIConnector } from './openai';
import { renderParameterTemplates } from './render';

export const getConnectorType = (): SubActionConnectorType<Config, Secrets> => ({
  id: OPENAI_CONNECTOR_ID,
  name: OPENAI_TITLE,
  getService: (params) => new OpenAIConnector(params),
  schema: {
    config: ConfigSchema,
    secrets: SecretsSchema,
  },
  validators: [{ type: ValidatorType.CONFIG, validator: configValidator }],
  supportedFeatureIds: [
    GenerativeAIForSecurityConnectorFeatureId,
    GenerativeAIForObservabilityConnectorFeatureId,
    GenerativeAIForSearchPlaygroundConnectorFeatureId,
  ],
  minimumLicenseRequired: 'enterprise' as const,
  renderParameterTemplates,
});

export const configValidator = (configObject: Config, validatorServices: ValidatorServices) => {
  try {
    assertURL(configObject.apiUrl);
    urlAllowListValidator('apiUrl')(configObject, validatorServices);

    const { apiProvider } = configObject;

    if (apiProvider !== OpenAiProviderType.OpenAi && apiProvider !== OpenAiProviderType.AzureAi) {
      throw new Error(
        `API Provider is not supported${
          apiProvider && (apiProvider as OpenAiProviderType).length ? `: ${apiProvider}` : ``
        }`
      );
    }

    return configObject;
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.genAi.configurationErrorApiProvider', {
        defaultMessage: 'Error configuring OpenAI action: {err}',
        values: {
          err,
        },
      })
    );
  }
};
