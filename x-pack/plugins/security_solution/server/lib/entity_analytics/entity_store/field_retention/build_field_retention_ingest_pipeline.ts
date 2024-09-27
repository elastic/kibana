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
  ...(DEBUG_MODE ? [debugDeepCopyContextStep()] : []),
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
    set: {
      field: 'entity.name',
      value: `{{${getIdentityFieldForEntityType(fieldRetentionDefinition.entityType)}}}`,
    },
  },
  arrayToSingleValueProcessor({
    field: `${fieldRetentionDefinition.entityType}.risk.calculated_level`,
  }),
  arrayToSingleValueProcessor({
    field: 'asset.criticality',
  }),
  ...getDotExpanderProcessors(allEntityFields),
  ...getFieldProcessors(fieldRetentionDefinition),
  ...getRemoveEmptyFieldProcessors(allEntityFields),
  removeEntityDefinitionFields(fieldRetentionDefinition.entityType),
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

const removeEntityDefinitionFields = (entityType: string): IngestProcessorContainer => ({
  remove: {
    ignore_failure: true,
    field: [
      'event',
      'entity.lastSeenTimestamp',
      'entity.schemaVersion',
      'entity.definitionVersion',
      'entity.identityFields',
      'entity.definitionId',
      'entity.displayName',
      'entity.firstSeenTimestamp',
    ],
  },
});

const arrayToSingleValueProcessor = ({ field }: { field: string }): IngestProcessorContainer => {
  const ctxField = `ctx.${field}`;
  return {
    script: {
      lang: 'painless',
      source: `
      if (!(${isFieldMissingOrEmpty(ctxField)})){
        if (${ctxField} instanceof List) {
          ${ctxField} = ${ctxField}[0];
        } else if (${ctxField} instanceof Set) {
          ${ctxField} = ${ctxField}.toArray()[0];
        }
      }
    `,
    },
  };
};

/**
 * Deeply copies the context so we can debug the pipeline
 * Deep copy is necessary because the context is a mutable object and painless copies by ref
 *
 * @return {*}  {IngestProcessorContainer}
 */
const debugDeepCopyContextStep = (): IngestProcessorContainer => ({
  script: {
    lang: 'painless',
    source: `
Map deepCopy(Map original) {
    Map copy = new HashMap();
    for (entry in original.entrySet()) {
        if (entry.getValue() instanceof Map) {
            // Recursively deep copy nested maps
            copy.put(entry.getKey(), deepCopy((Map)entry.getValue()));
        } else if (entry.getValue() instanceof List) {
            // Deep copy lists
            List newList = new ArrayList();
            for (item in (List)entry.getValue()) {
                if (item instanceof Map) {
                    newList.add(deepCopy((Map)item));
                } else {
                    newList.add(item);
                }
            }
            copy.put(entry.getKey(), newList);
        } else {
            // Copy by value for other types
            copy.put(entry.getKey(), entry.getValue());
        }
    }
    return copy;
}

ctx.debug_ctx = deepCopy(ctx);
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

  const classesWithEmptyCheck = ['List', 'String', 'Map', 'Set'];
  const emptyCheck = `((${classesWithEmptyCheck
    .map((c) => `${lastPath} instanceof ${c}`)
    .join(' || ')}) && ${lastPath}.isEmpty())`;

  return [...progressivePaths.map((path) => `${path} == null`), emptyCheck].join(' || ');
};

const preferNewestValueProcessor = ({ field }: PreferNewestValue): IngestProcessorContainer => {
  const historicalField = `${ENRICH_FIELD}.${field}`;
  return {
    set: {
      if: `${isFieldMissingOrEmpty(`ctx.${field}`)} && !(${isFieldMissingOrEmpty(
        `ctx.${historicalField}`
      )})`,
      field,
      value: `{{${historicalField}}}`,
    },
  };
};

const preferOldestValueProcessor = ({ field }: PreferOldestValue): IngestProcessorContainer => {
  const historicalField = `ctx.${ENRICH_FIELD}.${field}`;
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
  const ctxField = `ctx.${field}`;
  const enrichField = `ctx.${ENRICH_FIELD}.${field}`;
  return {
    script: {
      lang: 'painless',
      source: `
Set uniqueVals = new HashSet();

if (!(${isFieldMissingOrEmpty(ctxField)})) {
  uniqueVals.addAll(${ctxField});
}

if (uniqueVals.size() < params.max_length && !(${isFieldMissingOrEmpty(enrichField)})) {
  int remaining = params.max_length - uniqueVals.size();
  List historicalVals = ${enrichField}.subList(0, (int) Math.min(remaining, ${enrichField}.size()));
  uniqueVals.addAll(historicalVals);
}

${ctxField} = new ArrayList(uniqueVals).subList(0, (int) Math.min(params.max_length, uniqueVals.size()));
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
