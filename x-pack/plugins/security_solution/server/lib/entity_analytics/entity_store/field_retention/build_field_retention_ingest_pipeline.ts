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
  ...(!debugMode
    ? [
        ...getRemoveEmptyFieldProcessors(allEntityFields),
        {
          remove: {
            ignore_failure: true,
            field: ENRICH_FIELD,
          },
        },
        // the entity definition adds these
        {
          remove: {
            ignore_failure: true,
            field: 'entity',
          },
        },
        {
          remove: {
            ignore_failure: true,
            field: 'event',
          },
        },
        {
          remove: {
            ignore_failure: true,
            field: 'asset',
            if: isFieldMissingOrEmpty('ctx.asset'),
          },
        },
        {
          remove: {
            ignore_failure: true,
            field: `${fieldRetentionDefinition.entityType}.risk`,
            if: isFieldMissingOrEmpty(`ctx.${fieldRetentionDefinition.entityType}.risk`),
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
  const progressivePaths = getProgressivePathsNoCtx(convertPathToBracketNotation(field));
  const lastPath = progressivePaths.at(-1);
  const emptyArrayCheck = `(${lastPath} instanceof List && ${lastPath}.size() == 0)`;
  const emptyStringCheck = `(${lastPath} instanceof String && ${lastPath}.isEmpty())`;
  const emptyObjectCheck = `(${lastPath} instanceof Map && ${lastPath}.size() == 0)`;
  return [
    ...progressivePaths.map((path, index) => `${path} == null`),
    emptyArrayCheck,
    emptyStringCheck,
    emptyObjectCheck,
  ].join(' || ');
};

const keepOldestValueProcessor = ({ field }: KeepOldestValue): IngestProcessorContainer => {
  const historicalField = `${ENRICH_FIELD}.${field}`;
  const ctxField = `ctx.${field}`;
  return {
    set: {
      if: isFieldMissingOrEmpty(ctxField),
      field,
      value: `{{${historicalField}}}`,
    },
  };
};

export const convertPathToBracketNotation = (path: string): string => {
  const parts = path.split('.');
  return (
    parts[0] +
    parts
      .slice(1)
      .map((part) => `['${part}']`)
      .join('')
  );
};

/**
 * Converts a dot notation path to a list of progressive paths
 * e.g "a.b.c" => ["a", "a['b']", "a['b']['c']"]
 * if the path is "ctx.a.b.c", it will not return a ctx element
 * because we are only interested in the path after the context
 *
 * @param {string} path The path to convert
 * @return {*}  {string[]} The list of progressive paths
 */
export const getProgressivePathsNoCtx = (path: string): string[] => {
  const regex = /([^[\]]+)|(\['[^']+'\])/g;
  const matches = [...path.matchAll(regex)];

  const result: string[] = [];
  let currentPath = '';

  matches.forEach((match) => {
    currentPath += match[0]; // Bracket parts (e.g., "['b']")

    // Skip the first part if it is 'ctx'
    if (currentPath !== 'ctx') {
      result.push(currentPath);
    }
  });

  return result;
};

const collectValuesProcessor = ({ field, maxLength }: CollectValues) => {
  const fieldBrackets = convertPathToBracketNotation(`ctx.${field}`);
  const enrichFieldBrackets = convertPathToBracketNotation(`ctx.${ENRICH_FIELD}.${field}`);
  return {
    script: {
      lang: 'painless',
      source: `
  if (${fieldBrackets} == null) {
    ${fieldBrackets} = [];
  }

  List combinedItems = new ArrayList();

  combinedItems.addAll(${fieldBrackets});

  if (combinedItems.size() < params.max_length && ctx.${ENRICH_FIELD} != null && ${enrichFieldBrackets} != null) {
    int remaining = params.max_length - combinedItems.size();
    combinedItems.addAll(${enrichFieldBrackets}.subList(0, Math.min(remaining, ${enrichFieldBrackets}.size())));
  }

  ${fieldBrackets} = combinedItems.subList(0, (int) Math.min(params.max_length, combinedItems.size()));
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
        if: isFieldMissingOrEmpty(`ctx.${field}`),
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
