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
  GenerativeAIForSearchPlaygroundConnectorFeatureId,
  GenerativeAIForSecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { ValidatorServices } from '@kbn/actions-plugin/server/types';
import { GenerativeAIForObservabilityConnectorFeatureId } from '@kbn/actions-plugin/common/connector_feature_config';
import {
  INFERENCE_CONNECTOR_TITLE,
  INFERENCE_CONNECTOR_ID,
} from '../../../common/inference/constants';
import { ConfigSchema, SecretsSchema } from '../../../common/inference/schema';
import { Config, Secrets } from '../../../common/inference/types';
import { InferenceConnector } from './inference';
import { renderParameterTemplates } from './render';

export const getConnectorType = (): SubActionConnectorType<Config, Secrets> => ({
  id: INFERENCE_CONNECTOR_ID,
  name: INFERENCE_CONNECTOR_TITLE,
  getService: (params) => new InferenceConnector(params),
  schema: {
    config: ConfigSchema,
    secrets: SecretsSchema,
  },
  validators: [{ type: ValidatorType.CONFIG, validator: configValidator }],
  supportedFeatureIds: [
    GenerativeAIForSecurityConnectorFeatureId,
    GenerativeAIForSearchPlaygroundConnectorFeatureId,
    GenerativeAIForObservabilityConnectorFeatureId,
  ],
  minimumLicenseRequired: 'enterprise' as const,
  renderParameterTemplates,
});

export const configValidator = (configObject: Config, validatorServices: ValidatorServices) => {
  try {
    // TODO: add validation
    return configObject;
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.inference.configurationErrorApiProvider', {
        defaultMessage: 'Error configuring Inference API action: {err}',
        values: {
          err: err.toString(),
        },
      })
    );
  }
};
