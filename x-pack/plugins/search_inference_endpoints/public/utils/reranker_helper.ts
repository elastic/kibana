/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
export const isProviderTechPreview = (provider: InferenceAPIConfigResponse) => {
  if (hasModelId(provider)) {
    return provider.task_type === 'rerank' && provider.service_settings?.model_id?.startsWith('.');
  }

  return false;
};

function hasModelId(
  service: InferenceAPIConfigResponse
): service is Extract<InferenceAPIConfigResponse, { service_settings: { model_id: string } }> {
  return 'model_id' in service.service_settings;
}
