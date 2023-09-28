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
import { GenerativeAIConnectorFeatureId } from '@kbn/actions-plugin/common';
import { urlAllowListValidator } from '@kbn/actions-plugin/server';
import { ValidatorServices } from '@kbn/actions-plugin/server/types';
import { assertURL } from '@kbn/actions-plugin/server/sub_action_framework/helpers/validators';
import {
  OPEN_AI_CONNECTOR_ID,
  OPEN_AI_TITLE,
  OpenAiProviderType,
} from '../../../common/open_ai/constants';
import { ConfigSchema, SecretsSchema } from '../../../common/open_ai/schema';
import { Config, Secrets } from '../../../common/open_ai/types';
import { OpenAIConnector } from './open_ai';
import { renderParameterTemplates } from './render';

export const getConnectorType = (): SubActionConnectorType<Config, Secrets> => ({
  id: OPEN_AI_CONNECTOR_ID,
  name: OPEN_AI_TITLE,
  Service: OpenAIConnector,
  schema: {
    config: ConfigSchema,
    secrets: SecretsSchema,
  },
  validators: [{ type: ValidatorType.CONFIG, validator: configValidator }],
  supportedFeatureIds: [GenerativeAIConnectorFeatureId],
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
