/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { EmbeddableSetup, GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';
import { APM_SERVICE_MAP_EMBEDDABLE } from '@kbn/apm-embeddable-common';
import { serviceMapCustomStateSchema } from '../../../common/embeddable/service_map_embeddable_schema';

const getServiceMapEmbeddableSchema = (_getDrilldownsSchema: GetDrilldownsSchemaFnType) =>
  z
    .object({
      ...serializedTitlesSchema.shape,
      ...serializedTimeRangeSchema.shape,
      ...serviceMapCustomStateSchema.shape,
    })
    .meta({
      id: 'apm-service-map-embeddable',
      description: 'APM service map embeddable schema',
    });

export const registerServiceMapEmbeddableTransforms = (embeddable: EmbeddableSetup): void => {
  embeddable.registerEmbeddableServerDefinition(APM_SERVICE_MAP_EMBEDDABLE, {
    title: 'APM Service map',
    getSchema: getServiceMapEmbeddableSchema,
  });
};
