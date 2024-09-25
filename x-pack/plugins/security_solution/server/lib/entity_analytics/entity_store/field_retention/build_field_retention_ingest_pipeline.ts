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
  PreferNewestValue,
  PreferOldestValue,
} from './types';
import { getIdentityFieldForEntityType } from '../utils/utils';

const ENRICH_FIELD = 'historical';

const DEBUG_MODE = true; // TODO: do not commit this value

export const buildFieldRetentionIngestPipeline = ({
  fieldRetentionDefinition,
  enrichPolicyName,
  allEntityFields,
}: {
  fieldRetentionDefinition: FieldRetentionDefinition;
  enrichPolicyName: string;
  allEntityFields: string[];
}): IngestProcessorContainer[] => [
  ...(DEBUG_MODE ? [debugAddContextStep()] : []),
  {
    enrich: {
      policy_name: enrichPolicyName,
      field: fieldRetentionDefinition.matchField,
      target_field: ENRICH_FIELD,
    },
  },
  {
    set: {
      field: '@timestamp',
      value: '{{entity.lastSeenTimestamp}}',
    },
  },
  {
    remove: {
      ignore_failure: true,
      field: 'entity',
    },
  },
  {
    set: {
      field: 'entity.name',
      value: `{{${getIdentityFieldForEntityType(fieldRetentionDefinition.entityType)}}}`,
    },
  },
  ...getDotExpanderProcessors(allEntityFields),
  ...getFieldProcessors(fieldRetentionDefinition),
  ...getRemoveEmptyFieldProcessors(allEntityFields),
  arrayToSingleValueProcessor({
    field: `${fieldRetentionDefinition.entityType}.risk.calculated_level`,
  }),
  arrayToSingleValueProcessor({
    field: 'asset.criticality',
  }),
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
  ...(!DEBUG_MODE
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

const arrayToSingleValueProcessor = ({ field }: { field: string }): IngestProcessorContainer => {
  const ctxField = `ctx.${field}`;
  const fieldBrackets = convertPathToBracketNotation(ctxField);
  return {
    script: {
      lang: 'painless',
      source: `
      if (!(${isFieldMissingOrEmpty(ctxField)})){
        if (${fieldBrackets} instanceof List) {
          ctx.${field} = ${fieldBrackets}[0];
        } else if (${fieldBrackets} instanceof Set) {
          ctx.${field} = ${fieldBrackets}.toArray()[0];
        }
      }
    `,
    },
  };
};

const debugAddContextStep = (): IngestProcessorContainer => ({
  script: {
    lang: 'painless',
    source: `
    Map ctxCopy = new HashMap(ctx);
    ctxCopy.remove('_index');
    ctxCopy.remove('_id');
    ctxCopy.remove('_version');
    ctxCopy.remove('_seq_no');
    ctxCopy.remove('_primary_term');
    ctx.full_ctx = ctxCopy;
  `,
  },
});

const getFieldProcessors = (
  fieldRetentionDefinition: FieldRetentionDefinition
): IngestProcessorContainer[] => {
  return fieldRetentionDefinition.fields.map((field) => fieldToProcessorStep(field));
};

const isFieldMissingOrEmpty = (field: string): string => {
  const progressivePaths = getProgressivePathsNoCtx(convertPathToBracketNotation(field));
  const lastPath = progressivePaths.at(-1);
  const emptyArrayCheck = `(${lastPath} instanceof List && ${lastPath}.isEmpty())`;
  const emptyStringCheck = `(${lastPath} instanceof String && ${lastPath}.isEmpty())`;
  const emptyObjectCheck = `(${lastPath} instanceof Map && ${lastPath}.isEmpty())`;
  const isEmptySetCheck = `(${lastPath} instanceof Set && ${lastPath}.isEmpty())`;
  return [
    ...progressivePaths.map((path) => `${path} == null`),
    emptyArrayCheck,
    emptyStringCheck,
    emptyObjectCheck,
    isEmptySetCheck,
  ].join(' || ');
};

const preferNewestValueProcessor = ({ field }: PreferNewestValue): IngestProcessorContainer => {
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

const preferOldestValueProcessor = ({ field }: PreferOldestValue): IngestProcessorContainer => {
  const historicalField = `${ENRICH_FIELD}.${field}`;
  return {
    set: {
      if: `!(${isFieldMissingOrEmpty(historicalField)})`,
      field,
      value: `{{${historicalField}}}`,
    },
  };
};

/**
 * Converts a dot notation path to a bracket notation path
 * e.g "a.b.c" => "a['b']['c']"
 * @param {string} path
 * @return {*}  {string}
 */
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
  // capture groups for the path and the bracket notation
  // e.g "a['b']['c']" => ["a", "['b']", "['c']"]
  const regex = /([^[\]]+)|(\['[^']+'\])/g;
  const matches = [...path.matchAll(regex)];
  let currentPath = '';
  const paths: string[] = [];

  matches.forEach((match) => {
    currentPath += match[0];
    // Skip the path if it is 'ctx'
    if (currentPath !== 'ctx') {
      paths.push(currentPath);
    }
  });

  return paths;
};

const collectValuesProcessor = ({ field, maxLength }: CollectValues) => {
  const fieldBrackets = convertPathToBracketNotation(`ctx.${field}`);
  const enrichFieldBrackets = convertPathToBracketNotation(`ctx.${ENRICH_FIELD}.${field}`);
  return {
    script: {
      lang: 'painless',
      source: `
  if (${fieldBrackets} == null) {
    ${fieldBrackets} = new ArrayList();
  }

  List combinedItems = new ArrayList();

  combinedItems.addAll(${fieldBrackets});

  if (combinedItems.size() < params.max_length && ctx.${ENRICH_FIELD} != null && ${enrichFieldBrackets} != null) {
    int remaining = params.max_length - combinedItems.size();
    combinedItems.addAll(${enrichFieldBrackets}.subList(0, (int) Math.min(remaining, ${enrichFieldBrackets}.size())));
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
    case 'prefer_newest_value':
      return preferNewestValueProcessor(fieldOperator);
    case 'prefer_oldest_value':
      return preferOldestValueProcessor(fieldOperator);
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
