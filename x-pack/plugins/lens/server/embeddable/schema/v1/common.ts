/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObjectType, schema } from '@kbn/config-schema';
import { KBN_FIELD_TYPES } from '@kbn/field-types';

import { FilterStateStore } from '@kbn/es-query';
import { formBasedLayerSchema } from './data_sources/form_based';

const referenceSchema = schema.object(
  {
    name: schema.string(),
    type: schema.string(),
    id: schema.string(),
  },
  { unknowns: 'forbid' }
);

const lensGenericAttributesStateSchema = schema.object({
  datasourceStates: schema.recordOf(schema.string(), schema.any()),
  visualization: schema.any(),
  query: schema.object({
    query: schema.oneOf([
      schema.string({
        meta: {
          description:
            'A text-based query such as Kibana Query Language (KQL) or Lucene query language.',
        },
      }),
      schema.recordOf(schema.string(), schema.any()),
    ]),
    language: schema.string({
      meta: { description: 'The query language such as KQL or Lucene.' },
    }),
  }),
  globalPalette: schema.maybe(
    schema.object({
      activePaletteId: schema.string(),
      state: schema.maybe(schema.any()),
    })
  ),
  filters: schema.arrayOf(
    schema.object(
      {
        meta: schema.object(
          {
            alias: schema.maybe(schema.nullable(schema.string())),
            disabled: schema.maybe(schema.boolean()),
            negate: schema.maybe(schema.boolean()),
            controlledBy: schema.maybe(schema.string()),
            group: schema.maybe(schema.string()),
            index: schema.maybe(schema.string()),
            isMultiIndex: schema.maybe(schema.boolean()),
            type: schema.maybe(schema.string()),
            key: schema.maybe(schema.string()),
            params: schema.maybe(schema.any()),
            value: schema.maybe(schema.string()),
            field: schema.maybe(schema.string()),
          },
          { unknowns: 'allow' }
        ),
        query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
        $state: schema.maybe(
          schema.object({
            store: schema.oneOf(
              [
                schema.literal(FilterStateStore.APP_STATE),
                schema.literal(FilterStateStore.GLOBAL_STATE),
              ],
              {
                meta: {
                  description:
                    "Denote whether a filter is specific to an application's context (e.g. 'appState') or whether it should be applied globally (e.g. 'globalState').",
                },
              }
            ),
          })
        ),
      },
      { meta: { description: 'A filter for the search source.' } }
    )
  ),
  adHocDataViews: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  internalReferences: schema.maybe(schema.arrayOf(referenceSchema)),
});

const metaType = (Object.keys(KBN_FIELD_TYPES) as Array<keyof typeof KBN_FIELD_TYPES>).map((key) =>
  schema.literal(KBN_FIELD_TYPES[key])
);

const datatableColumnSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
  meta: schema.object({
    type: schema.oneOf(metaType as [(typeof metaType)[number]]),
    esType: schema.maybe(schema.string()),
    field: schema.maybe(schema.string()),
    index: schema.maybe(schema.string()),
    dimensionName: schema.maybe(schema.string()),
    params: schema.maybe(schema.any()),
    source: schema.maybe(schema.string()),
    sourceParams: schema.maybe(
      schema.object({
        id: schema.maybe(schema.string()),
        params: schema.maybe(schema.recordOf(schema.string(), schema.any())),
      })
    ),
  }),
  isNull: schema.maybe(schema.boolean()),
});

const paletteSchema = schema.object({
  type: schema.oneOf([schema.literal('palette'), schema.literal('system_palette')]),
  name: schema.string(),
  params: schema.maybe(schema.any()),
});

export const columnStateSchema = schema.object({
  columnId: schema.string(),
  width: schema.maybe(schema.number()),
  hidden: schema.maybe(schema.boolean()),
  oneClickFilter: schema.maybe(schema.boolean()),
  isTransposed: schema.maybe(schema.boolean()),
  transposable: schema.maybe(schema.boolean()),
  originalColumnId: schema.maybe(schema.string()),
  originalName: schema.maybe(schema.string()),
  bucketValues: schema.maybe(
    schema.arrayOf(
      schema.object({
        originalBucketColumn: datatableColumnSchema,
        value: schema.any(),
      })
    )
  ),
  alignment: schema.maybe(
    schema.oneOf([schema.literal('left'), schema.literal('right'), schema.literal('center')])
  ),
  palette: schema.maybe(paletteSchema),
  colorMapping: schema.maybe(schema.any()),
  colorMode: schema.maybe(
    schema.oneOf([schema.literal('none'), schema.literal('cell'), schema.literal('text')])
  ),
  summaryRow: schema.maybe(
    schema.oneOf([
      schema.literal('none'),
      schema.literal('sum'),
      schema.literal('avg'),
      schema.literal('count'),
      schema.literal('min'),
      schema.literal('max'),
    ])
  ),
  summaryLabel: schema.maybe(schema.string()),
  collapseFn: schema.maybe(
    schema.oneOf([
      schema.literal('sum'),
      schema.literal('avg'),
      schema.literal('min'),
      schema.literal('max'),
    ])
  ),
  isMetric: schema.maybe(schema.boolean()),
});

export const rowHeightModeSchema = schema.oneOf([
  schema.literal('auto'),
  schema.literal('single'),
  schema.literal('custom'),
]);

export const sortingStateSchema = schema.object({
  columnId: schema.maybe(schema.string()),
  direction: schema.oneOf([schema.literal('asc'), schema.literal('desc'), schema.literal('none')]),
});

export const lensGenericAttributesSchema = schema.object({
  type: schema.maybe(schema.string()),
  visualizationType: schema.nullable(schema.string()),
  title: schema.maybe(schema.string()),
  description: schema.maybe(schema.string()),
  state: lensGenericAttributesStateSchema,
  references: schema.arrayOf(referenceSchema),
});

export const getLensAttributesSchema = (visType: string, visState: ObjectType) =>
  lensGenericAttributesSchema.extends({
    visualizationType: schema.literal(visType),
    state: lensGenericAttributesStateSchema.extends({
      datasourceStates: schema.object({
        formBased: schema.maybe(
          schema.object({
            layers: schema.recordOf(schema.string(), formBasedLayerSchema),
          })
        ),
        textBased: schema.maybe(
          schema.object({
            // TODO add schema for text based datasource to ./text_based.ts
            layers: schema.recordOf(schema.string(), schema.any()),
            initialContext: schema.maybe(schema.any()),
          })
        ),
      }),
      visualization: visState,
    }),
  });
