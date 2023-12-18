/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  objectTypeToGetResultSchema,
  savedObjectSchema,
  createResultSchema,
} from '@kbn/content-management-utils';
import { ServicesDefinition } from '@kbn/object-versioning/lib/content_management_types';
import {
  serviceDefinition as serviceDefinitionV1,
  mapAttributesSchema as mapAttributesSchemaV1,
  MapCrudTypes as MapCrudTypesV1,
} from '../v1';
import { MapCrudTypes } from './types';

export const mapAttributesSchema = mapAttributesSchemaV1.extends(
  {
    mapState: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    uiState: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    layerList: schema.maybe(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
    // Setting the following to undefined removes them from the schema, I think?
    // Based on docs in packages/kbn-config-schema/src/types/object_type.ts
    // mapStateJSON: undefined,
    // uiStateJSON: undefined,
    // layerListJSON: undefined,
  },
  {
    unknowns: 'forbid',
  }
);

const mapSavedObjectSchema = savedObjectSchema(mapAttributesSchema);

export const serviceDefinition: ServicesDefinition = {
  ...serviceDefinitionV1,
  get: {
    out: {
      result: {
        schema: objectTypeToGetResultSchema(mapSavedObjectSchema),
        down: (result: MapCrudTypes['GetOut']): MapCrudTypesV1['GetOut'] => {
          const { uiState, mapState, layerList, ...rest } = result.item.attributes;
          return {
            ...result,
            item: {
              ...result.item,
              attributes: {
                ...rest,
                uiStateJSON: uiState ? JSON.stringify(uiState) : undefined,
                mapStateJSON: mapState ? JSON.stringify(mapState) : undefined,
                layerListJSON: layerList ? JSON.stringify(layerList) : undefined,
              },
            },
          };
        },
      },
    },
  },
  create: {
    in: {
      ...serviceDefinitionV1.create?.in,
      data: {
        schema: mapAttributesSchema,
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
      ...serviceDefinitionV1.update?.in,
      data: {
        schema: mapAttributesSchema,
      },
    },
    out: {
      result: {
        schema: createResultSchema(mapSavedObjectSchema),
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
