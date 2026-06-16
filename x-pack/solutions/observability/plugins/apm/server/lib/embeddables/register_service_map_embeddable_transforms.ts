/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup, GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import { schema } from '@kbn/config-schema';
import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';
import { APM_SERVICE_MAP_EMBEDDABLE } from '@kbn/apm-embeddable-common';
import { serviceMapCustomStateSchema } from '../../../common/embeddable/service_map_embeddable_schema';

// The custom-state schema + state type live in `common/` so client code can import the type
// without reaching into `server/` (review #15). The titles / time-range schemas come from a
// server package, so the full `allOf` is assembled here. Drilldowns aren't part of this
// embeddable's state, so the registration hook ignores the drilldowns schema.
const getServiceMapEmbeddableSchema = (_getDrilldownsSchema: GetDrilldownsSchemaFnType) =>
  schema.allOf([serializedTitlesSchema, serializedTimeRangeSchema, serviceMapCustomStateSchema], {
    meta: {
      id: 'apm-service-map-embeddable',
      description: 'APM service map embeddable schema',
    },
  });

export const registerServiceMapEmbeddableTransforms = (embeddable: EmbeddableSetup): void => {
  embeddable.registerEmbeddableServerDefinition(APM_SERVICE_MAP_EMBEDDABLE, {
    title: 'APM Service map',
    getSchema: getServiceMapEmbeddableSchema,
  });
};
