/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexPattern } from '../../../../../../../../src/plugins/data/common/index_patterns/index_patterns';
import { getField } from '../../../../../common/elasticsearch_util';

export interface ScriptField {
  source: string;
  lang: string;
}

export function getDocValueAndSourceFields(
  indexPattern: IndexPattern,
  fieldNames: string[],
  dateFormat: string
): {
  docValueFields: Array<string | { format: string; field: string }>;
  sourceOnlyFields: string[];
  scriptFields: Record<string, { script: ScriptField }>;
} {
  const docValueFields: Array<string | { format: string; field: string }> = [];
  const sourceOnlyFields: string[] = [];
  const scriptFields: Record<string, { script: ScriptField }> = {};
  fieldNames.forEach((fieldName) => {
    const field = getField(indexPattern, fieldName);
    if (field.scripted) {
      scriptFields[field.name] = {
        script: {
          source: field.script || '',
          lang: field.lang || '',
        },
      };
    }
    // @ts-expect-error runtimeField has not been added to public API yet. exact shape of type TBD.
    else if (field.readFromDocValues || field.runtimeField) {
      const docValueField =
        field.type === 'date'
          ? {
              field: fieldName,
              format: dateFormat,
            }
          : fieldName;
      docValueFields.push(docValueField);
    } else {
      sourceOnlyFields.push(fieldName);
    }
  });

  return { docValueFields, sourceOnlyFields, scriptFields };
}
