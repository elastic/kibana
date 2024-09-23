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
  definition,
  enrichPolicyName,
  debugMode = false,
}: {
  definition: FieldRetentionDefinition;
  enrichPolicyName: string;
  debugMode?: boolean;
}): IngestProcessorContainer[] => [
  {
    enrich: {
      policy_name: enrichPolicyName,
      field: definition.matchField,
      target_field: ENRICH_FIELD,
    },
  },
  ...getFieldProcessors(definition),
  ...(debugMode ? getRemoveEmptyFieldProcessors(definition) : []),
  ...(debugMode
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

const getFieldProcessors = (definition: FieldRetentionDefinition): IngestProcessorContainer[] => {
  return definition.fields.map((field) => fieldToProcessorStep(field));
};

const isFieldMissingOrEmpty = (field: string): string => {
  const fieldParts = field.split('.');
  const partsCheck = fieldParts.reduce((acc, part, index) => {
    const path = fieldParts.slice(0, index + 1).join('.');
    return `${acc}ctx.${path} == null${index < fieldParts.length - 1 ? ' || ' : ''}`;
  }, '');

  const emptyArrayCheck = `(ctx.${field} instanceof List && ctx.${field}.size() == 0)`;

  return `${partsCheck} || ${emptyArrayCheck}`;
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

const getRemoveEmptyFieldProcessors = (
  definition: FieldRetentionDefinition
): IngestProcessorContainer[] =>
  definition.fields.map(({ field }) => {
    return {
      remove: {
        if: isFieldMissingOrEmpty(field),
        field,
        ignore_missing: true,
      },
    };
  });

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
