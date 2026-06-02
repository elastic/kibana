/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { APM_SERVICE_MAP_EMBEDDABLE } from '@kbn/apm-embeddable-common';
import { getServiceMapEmbeddableSchema } from './service_map_embeddable_schema';

export const registerServiceMapEmbeddableTransforms = (embeddable: EmbeddableSetup): void => {
  embeddable.registerEmbeddableServerDefinition(APM_SERVICE_MAP_EMBEDDABLE, {
    title: 'APM Service map',
    getSchema: getServiceMapEmbeddableSchema,
  });
};
