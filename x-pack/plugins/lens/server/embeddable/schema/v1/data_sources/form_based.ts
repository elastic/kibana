/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const fieldOnlyDataTypeSchema = schema.oneOf([
  schema.literal('document'),
  schema.literal('ip'),
  schema.literal('histogram'),
  schema.literal('geo_point'),
  schema.literal('geo_shape'),
  schema.literal('counter'),
  schema.literal('gauge'),
  schema.literal('murmur3'),
]);

const dataTypeSchema = schema.oneOf([
  schema.literal('string'),
  schema.literal('number'),
  schema.literal('date'),
  schema.literal('boolean'),
  fieldOnlyDataTypeSchema,
]);

const operationMetadataSchema = schema.object({
  interval: schema.maybe(schema.string()),
  dataType: dataTypeSchema,
  isBucketed: schema.boolean(),
  scale: schema.maybe(
    schema.oneOf([schema.literal('ordinal'), schema.literal('interval'), schema.literal('ratio')])
  ),
  isStaticValue: schema.maybe(schema.boolean()),
});

const operationSchema = operationMetadataSchema.extends({
  label: schema.maybe(schema.string()),
  sortingHint: schema.maybe(schema.string()),
});

const baseIndexPatternColumnSchema = operationSchema.extends({
  operationType: schema.string(),
  customLabel: schema.maybe(schema.string()),
  timeScale: schema.maybe(schema.any()),
  filter: schema.maybe(schema.any()),
  reducedTimeRange: schema.maybe(schema.string()),
  timeShift: schema.maybe(schema.string()),
});

const valueFormatConfigSchema = schema.object({
  id: schema.string(),
  params: schema.maybe(
    schema.object({
      decimals: schema.number(),
      suffix: schema.maybe(schema.string()),
      compact: schema.maybe(schema.boolean()),
      pattern: schema.maybe(schema.string()),
      fromUnit: schema.maybe(schema.string()),
      toUnit: schema.maybe(schema.string()),
    })
  ),
});

const fieldBasedIndexPatternColumnSchema = baseIndexPatternColumnSchema.extends({
  sourceField: schema.string(),
});

const formattedIndexPatternColumnSchema = baseIndexPatternColumnSchema.extends({
  params: schema.maybe(
    schema.object({
      format: schema.maybe(valueFormatConfigSchema),
    })
  ),
});

const termsIndexPatternColumnSchema = fieldBasedIndexPatternColumnSchema.extends({
  operationType: schema.literal('terms'),
  params: schema.object({
    size: schema.number(),
    accuracyMode: schema.maybe(schema.boolean()),
    include: schema.maybe(schema.arrayOf(schema.oneOf([schema.string(), schema.number()]))),
    exclude: schema.maybe(schema.arrayOf(schema.oneOf([schema.string(), schema.number()]))),
    includeIsRegex: schema.maybe(schema.boolean()),
    excludeIsRegex: schema.maybe(schema.boolean()),
    orderBy: schema.oneOf([
      schema.object({
        type: schema.literal('alphabetical'),
        fallback: schema.maybe(schema.boolean()),
      }),
      schema.object({
        type: schema.literal('rare'),
        maxDocCount: schema.number(),
      }),
      schema.literal('significant'),
      schema.object({
        type: schema.literal('column'),
        columnId: schema.string(),
      }),
      schema.literal('custom'),
    ]),
    orderAgg: schema.maybe(fieldBasedIndexPatternColumnSchema),
    orderDirection: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
    otherBucket: schema.maybe(schema.boolean()),
    missingBucket: schema.maybe(schema.boolean()),
    secondaryFields: schema.maybe(schema.arrayOf(schema.string())),
    format: schema.maybe(valueFormatConfigSchema),
    parentFormat: schema.maybe(schema.object({ id: schema.string() })),
  }),
});

const referenceBasedIndexPatternColumnSchema = formattedIndexPatternColumnSchema.extends({
  references: schema.arrayOf(schema.string()),
});

const genericIndexPatternColumnSchema = schema.oneOf([
  baseIndexPatternColumnSchema,
  fieldBasedIndexPatternColumnSchema,
  referenceBasedIndexPatternColumnSchema,
]);

const incompleteColumnSchema = schema.object({
  operationType: schema.maybe(schema.string()),
  sourceField: schema.maybe(schema.string()),
});

export const formBasedLayerSchema = schema.object({
  columnOrder: schema.arrayOf(schema.string()),
  columns: schema.recordOf(
    schema.string(),
    schema.oneOf([termsIndexPatternColumnSchema, genericIndexPatternColumnSchema])
  ),
  // TODO indexPatternId should be required, but we make it optional since it might be
  // specified in the state.references array via the HTTP endpoint.
  indexPatternId: schema.maybe(schema.string()),
  linkToLayers: schema.maybe(schema.arrayOf(schema.string())),
  incompleteColumns: schema.maybe(
    schema.recordOf(schema.string(), schema.maybe(incompleteColumnSchema))
  ),
  sampling: schema.maybe(schema.number()),
  ignoreGlobalFilters: schema.maybe(schema.boolean()),
});
