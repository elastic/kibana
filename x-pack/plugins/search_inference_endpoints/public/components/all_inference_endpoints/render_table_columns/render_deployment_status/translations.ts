/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MODEL_DEPLOYED = i18n.translate(
  'xpack.searchInferenceEndpoints.deploymentStatus.tooltip.modelDeployed',
  {
    defaultMessage: 'Model is deployed',
  }
);

export const MODEL_NOT_DEPLOYED = i18n.translate(
  'xpack.searchInferenceEndpoints.deploymentStatus.tooltip.modelNotDeployed',
  {
    defaultMessage: 'Model is not deployed',
  }
);

export const MODEL_FAILED_TO_BE_DEPLOYED = i18n.translate(
  'xpack.searchInferenceEndpoints.deploymentStatus.tooltip.modelFailedToBeDeployed',
  {
    defaultMessage: 'Model can not be deployed',
  }
);
