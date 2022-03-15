/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '../../../../../../../../src/plugins/data/common';
import { getField } from '../../../../../common/elasticsearch_util';

export interface ScriptField {
  source: string;
  lang: string;
}

export function getDocValueAndSourceFields(
  indexPattern: DataView,
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
    } else if (field.readFromDocValues || field.runtimeField) {
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
