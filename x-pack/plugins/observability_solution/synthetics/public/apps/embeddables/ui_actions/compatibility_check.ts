/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiIsPresentationContainer, PresentationContainer } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';

export const compatibilityCheck = (
  api: EmbeddableApiContext['embeddable']
): api is PresentationContainer => {
  return apiIsPresentationContainer(api);
};
