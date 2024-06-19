/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { RenderElasticsearch } from './render_elasticsearch';
import { RenderCohere } from './render_cohere';
import { ServiceProviderKeys } from '../../types';
import { RenderHuggingFace } from './render_hugging_face';
import { RenderOpenAI } from './render_open_ai';

export interface RenderEndpointProps {
  endpoint: InferenceAPIConfigResponse;
}

type RenderMapType = {
  [key in ServiceProviderKeys]?: JSX.Element;
};

export const RenderEndpoint: React.FC<RenderEndpointProps> = ({ endpoint }) => {
  const renderMap: RenderMapType = {
    [ServiceProviderKeys.elser]: <RenderElasticsearch endpoint={endpoint} />,
    [ServiceProviderKeys.elasticsearch]: <RenderElasticsearch endpoint={endpoint} />,
    [ServiceProviderKeys.cohere]: <RenderCohere endpoint={endpoint} />,
    [ServiceProviderKeys.hugging_face]: <RenderHuggingFace endpoint={endpoint} />,
    [ServiceProviderKeys.openai]: <RenderOpenAI endpoint={endpoint} />,
  };

  return renderMap[endpoint.service] || <strong>{endpoint.model_id}</strong>;
};
