/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../../../app_context';
import type { Field, Fields } from '../../fields/field';

const QUERY_DEFAULT_FIELD_TYPES = ['keyword', 'text', 'match_only_text', 'wildcard'];
const QUERY_DEFAULT_FIELD_LIMIT = 1024;

const flattenAndExtractFields = (fields: Fields, path: string = ''): Field[] => {
  let newFields: Array<Pick<Field, 'name' | 'type' | 'default_field'>> = [];
  fields.forEach((field) => {
    const fieldName = path ? `${path}.${field.name}` : field.name;
    newFields.push({
      ...field,
      name: fieldName,
    });
    if (field.fields && field.fields.length) {
      newFields = newFields.concat(flattenAndExtractFields(field.fields, fieldName));
    }
  });
  return newFields;
};

export function buildDefaultSettings({
  templateName,
  packageName,
  fields,
  ilmPolicy,
  type,
}: {
  type: string;
  templateName: string;
  packageName: string;
  ilmPolicy?: string | undefined;
  fields: Field[];
}) {
  const logger = appContextService.getLogger();
  // Find all field names to set `index.query.default_field` to, which will be
  // the first 1024 keyword or text fields
  const defaultFields = flattenAndExtractFields(fields).filter(
    (field) =>
      field.type &&
      QUERY_DEFAULT_FIELD_TYPES.includes(field.type) &&
      field.default_field !== false &&
      field.index !== false &&
      field.doc_values !== false
  );
  if (defaultFields.length > QUERY_DEFAULT_FIELD_LIMIT) {
    logger.warn(
      `large amount of default fields detected for index template ${templateName} in package ${packageName}, applying the first ${QUERY_DEFAULT_FIELD_LIMIT} fields`
    );
  }
  const defaultFieldNames = (
    defaultFields.length > QUERY_DEFAULT_FIELD_LIMIT
      ? defaultFields.slice(0, QUERY_DEFAULT_FIELD_LIMIT)
      : defaultFields
  ).map((field) => field.name);

  const isILMPolicyDisabled = appContextService.getConfig()?.internal?.disableILMPolicies ?? false;

  return {
    index: {
      ...(isILMPolicyDisabled
        ? {}
        : {
            // ILM Policy must be added here, for now point to the default global ILM policy name
            lifecycle: {
              name: ilmPolicy ? ilmPolicy : type,
            },
          }),
      // What should be our default for the compression?
      codec: 'best_compression',
      // setting `ignore_malformed` only for data_stream for logs
      ...(type === 'logs'
        ? {
            mapping: {
              ignore_malformed: true,
            },
          }
        : {}),
      // All the default fields which should be queried have to be added here.
      // So far we add all keyword and text fields here if there are any, otherwise
      // this setting is skipped.
      ...(defaultFieldNames.length
        ? {
            query: {
              default_field: defaultFieldNames,
            },
          }
        : {}),
    },
  };
}
