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

  return `${partsCheck} || ctx.${field}.size() == 0`;
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

const collectValuesProcessor = (
  { field, count }: CollectValues,
  enrichField: string
): IngestProcessorContainer => {
  return {
    script: {
      source: `
            def values = ctx.${field};
            def enrichValues = ctx.${enrichField}.${field};
            if (values == null) {
            values = [];
            }
            if (enrichValues != null) {
            values.addAll(enrichValues);
            }
            if (values.size() > ${count}) {
            values = values.subList(0, ${count});
            }
            return values;
        `,
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
