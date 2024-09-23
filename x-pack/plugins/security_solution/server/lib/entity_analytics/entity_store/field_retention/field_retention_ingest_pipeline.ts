/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type {
  CollectValues,
  FieldRetentionDefinition,
  FieldRetentionOperator,
  KeepOldestValue,
} from './types';

export const buildFieldRetentionPipeline = (
  definition: FieldRetentionDefinition,
  enrichField: string
): IngestProcessorContainer[] => {
  return definition.fields.map((field) => fieldToProcessorStep(field, enrichField));
};

const checkIfFieldExists = (field: string): string => {
  const fieldParts = field.split('.');
  const partsCheck = fieldParts.reduce((acc, part, index) => {
    const path = fieldParts.slice(0, index + 1).join('.');
    return `${acc}ctx.${path} == null || `;
  }, '');

  return `${partsCheck} ctx.${field}.size() == 0`;
};

const keepOldestValueProcessor = (
  { field }: KeepOldestValue,
  enrichField: string
): IngestProcessorContainer => {
  return {
    set: {
      if: checkIfFieldExists(field),
      field,
      value: `{{${enrichField}.${field}}}`,
    },
  };
};

const collectValuesProcessor = ({ field, maxLength }: CollectValues, enrichField: string) => {
  return {
    script: {
      lang: 'painless',
      source: `
if (ctx.${field} == null) {
  ctx.${field} = [];
}

List combinedItems = new ArrayList();

combinedItems.addAll(ctx.${field});

if (combinedItems.size() < params.max_length && ctx.${enrichField} != null && ctx.${enrichField}.${field} != null) {
  int remaining = params.max_length - combinedItems.size();
  combinedItems.addAll(ctx.${enrichField}.${field}.subList(0, Math.min(remaining, ctx.${enrichField}.${field}.size())));
}

ctx.${field} = combinedItems.subList(0, (int) Math.min(params.max_length, combinedItems.size()));
          `,
      params: {
        max_length: maxLength,
      },
    },
  };
};

const fieldToProcessorStep = (
  fieldOperator: FieldRetentionOperator,
  enrichField: string
): IngestProcessorContainer => {
  switch (fieldOperator.operation) {
    case 'keep_oldest_value':
      return keepOldestValueProcessor(fieldOperator, enrichField);
    case 'collect_values':
      return collectValuesProcessor(fieldOperator, enrichField);
  }
};
