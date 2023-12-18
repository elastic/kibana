/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';
import {
  savedObjectSchema,
  objectTypeToGetResultSchema,
  createOptionsSchemas,
  createResultSchema,
} from '@kbn/content-management-utils';
import { MapCrudTypes } from './types';
import { MapCrudTypes as MapCrudTypesV2 } from '../v2';

export const mapAttributesSchema = schema.object(
  {
    title: schema.string(),
    description: schema.maybe(schema.nullable(schema.string())),
    mapStateJSON: schema.maybe(schema.string()),
    layerListJSON: schema.maybe(schema.string()),
    uiStateJSON: schema.maybe(schema.string()),
  },
  { unknowns: 'forbid' }
);

const mapSavedObjectSchema = savedObjectSchema(mapAttributesSchema);

const searchOptionsSchema = schema.maybe(
  schema.object(
    {
      onlyTitle: schema.maybe(schema.boolean()),
    },
    { unknowns: 'forbid' }
  )
);

const createOptionsSchema = schema.object({
  references: schema.maybe(createOptionsSchemas.references),
});

// Content management service definition.
// We need it for BWC support between different versions of the content
export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: objectTypeToGetResultSchema(mapSavedObjectSchema),
      },
    },
  },
  create: {
    in: {
      options: {
        schema: createOptionsSchema,
      },
      data: {
        schema: mapAttributesSchema,
        up: (data: MapCrudTypes['CreateIn']['data']): MapCrudTypesV2['CreateIn']['data'] => {
          const { uiStateJSON, mapStateJSON, layerListJSON, ...rest } = data;
          return {
            ...rest,
            uiState: uiStateJSON ? JSON.parse(uiStateJSON) : undefined,
            mapState: mapStateJSON ? JSON.parse(mapStateJSON) : undefined,
            layerList: layerListJSON ? JSON.parse(layerListJSON) : undefined,
          };
        },
      },
    },
    out: {
      result: {
        schema: createResultSchema(mapSavedObjectSchema),
      },
    },
  },
  update: {
    in: {
      options: {
        schema: createOptionsSchema, // same as create
      },
      data: {
        schema: mapAttributesSchema,
        up: (data: MapCrudTypes['CreateIn']['data']): MapCrudTypesV2['CreateIn']['data'] => {
          const { uiStateJSON, mapStateJSON, layerListJSON, ...rest } = data;
          return {
            ...rest,
            uiState: uiStateJSON ? JSON.parse(uiStateJSON) : undefined,
            mapState: mapStateJSON ? JSON.parse(mapStateJSON) : undefined,
            layerList: layerListJSON ? JSON.parse(layerListJSON) : undefined,
          };
        },
      },
    },
  },
  search: {
    in: {
      options: {
        schema: searchOptionsSchema,
      },
    },
  },
  mSearch: {
    out: {
      result: {
        schema: mapSavedObjectSchema,
      },
    },
  },
};
