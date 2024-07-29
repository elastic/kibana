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
  HuggingFaceProviderType,
  HUGGINGFACE_CONNECTOR_ID,
  HUGGINGFACE_TITLE,
} from '../../../common/huggingface/constants';
import { ConfigSchema, SecretsSchema } from '../../../common/huggingface/schema';
import { Config, Secrets } from '../../../common/huggingface/types';
import { HuggingFaceConnector } from './huggingface';
import { renderParameterTemplates } from './render';

export const getConnectorType = (): SubActionConnectorType<Config, Secrets> => ({
  id: HUGGINGFACE_CONNECTOR_ID,
  name: HUGGINGFACE_TITLE,
  getService: (params) => {
    return new HuggingFaceConnector(params);
  },
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

    if (apiProvider !== HuggingFaceProviderType.HuggingFace) {
      throw new Error(
        `API Provider is not supported${
          apiProvider && (apiProvider as HuggingFaceProviderType).length ? `: ${apiProvider}` : ``
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
