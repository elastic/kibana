/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceConnector, InferenceConnectorType } from '@kbn/inference-common';

/**
 * Naive utility function to consistently return the "best" connector for workchat features.
 *
 * In practice, mostly useful for development, as for production there should always be a single connector
 */
export const getDefaultConnector = ({ connectors }: { connectors: InferenceConnector[] }) => {
  //
  const inferenceConnector = connectors.find(
    (connector) => connector.type === InferenceConnectorType.Inference
  );
  if (inferenceConnector) {
    return inferenceConnector;
  }

  const openAIConnector = connectors.find(
    (connector) => connector.type === InferenceConnectorType.OpenAI
  );
  if (openAIConnector) {
    return openAIConnector;
  }

  return connectors[0];
};
