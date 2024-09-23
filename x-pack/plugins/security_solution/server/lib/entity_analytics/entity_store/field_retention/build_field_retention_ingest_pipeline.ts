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

const ENRICH_FIELD = 'historical';

export const buildFieldRetentionIngestPipeline = ({
  fieldRetentionDefinition,
  enrichPolicyName,
  allEntityFields,
  debugMode = false,
}: {
  fieldRetentionDefinition: FieldRetentionDefinition;
  enrichPolicyName: string;
  allEntityFields: string[];
  debugMode?: boolean;
}): IngestProcessorContainer[] => [
  {
    enrich: {
      policy_name: enrichPolicyName,
      field: fieldRetentionDefinition.matchField,
      target_field: ENRICH_FIELD,
    },
  },
  ...getDotExpanderProcessors(allEntityFields),
  ...getFieldProcessors(fieldRetentionDefinition),
  ...(!debugMode ? getRemoveEmptyFieldProcessors(allEntityFields) : []),
  ...(!debugMode
    ? [
        {
          remove: {
            ignore_failure: true,
            field: ENRICH_FIELD,
          },
        },
      ]
    : []),
];

const getFieldProcessors = (
  fieldRetentionDefinition: FieldRetentionDefinition
): IngestProcessorContainer[] => {
  return fieldRetentionDefinition.fields.map((field) => fieldToProcessorStep(field));
};

const isFieldMissingOrEmpty = (field: string): string => {
  const fieldParts = field.split('.');
  return fieldParts.reduce((acc, part, index) => {
    const path = fieldParts
      .slice(0, index + 1)
      .map((p) => `['${p}']`)
      .join('');

    // Check if the current path part is missing or null
    let condition = `ctx${path} == null`;

    // At the final field level, add the empty array check
    if (index === fieldParts.length - 1) {
      const emptyArrayCheck = `(ctx${path} instanceof List && ctx${path}.size() == 0)`;
      const emptyStringCheck = `(ctx${path} instanceof String && ctx${path}.isEmpty())`;
      condition += ` || ${emptyArrayCheck} || ${emptyStringCheck}`;
    }

    return `${acc}${condition}${index < fieldParts.length - 1 ? ' || ' : ''}`;
  }, '');
};

const keepOldestValueProcessor = ({ field }: KeepOldestValue): IngestProcessorContainer => {
  const historicalField = `${ENRICH_FIELD}.${field}`;
  return {
    set: {
      if: isFieldMissingOrEmpty(field),
      field,
      value: `{{${historicalField}}}`,
    },
  };
};

const collectValuesProcessor = ({ field, maxLength }: CollectValues) => {
  return {
    script: {
      lang: 'painless',
      source: `
  if (ctx.${field} == null) {
    ctx.${field} = [];
  }

  List combinedItems = new ArrayList();

  combinedItems.addAll(ctx.${field});

  if (combinedItems.size() < params.max_length && ctx.${ENRICH_FIELD} != null && ctx.${ENRICH_FIELD}.${field} != null) {
    int remaining = params.max_length - combinedItems.size();
    combinedItems.addAll(ctx.${ENRICH_FIELD}.${field}.subList(0, Math.min(remaining, ctx.${ENRICH_FIELD}.${field}.size())));
  }

  ctx.${field} = combinedItems.subList(0, (int) Math.min(params.max_length, combinedItems.size()));
            `,
      params: {
        max_length: maxLength,
      },
    },
  };
};

const fieldToProcessorStep = (fieldOperator: FieldRetentionOperator): IngestProcessorContainer => {
  switch (fieldOperator.operation) {
    case 'keep_oldest_value':
      return keepOldestValueProcessor(fieldOperator);
    case 'collect_values':
      return collectValuesProcessor(fieldOperator);
  }
};

const getRemoveEmptyFieldProcessors = (fields: string[]): IngestProcessorContainer[] =>
  fields.map((field) => {
    return {
      remove: {
        if: isFieldMissingOrEmpty(field),
        field,
        ignore_missing: true,
      },
    };
  });

const getDotExpanderProcessors = (fields: string[]): IngestProcessorContainer[] =>
  fields.map((field) => {
    return {
      dot_expander: {
        field,
      },
    };
  });
