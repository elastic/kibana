/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dictionary } from '../../../../common/types/common';

import { SimpleQuery } from '../../common';

export type EsFieldName = string;

type EsId = string;
type EsDocSource = Dictionary<any>;

export interface EsDoc extends Dictionary<any> {
  _id: EsId;
  _source: EsDocSource;
}

export const MAX_COLUMNS = 5;

function getFlattenedFields(obj: EsDocSource): EsFieldName[] {
  const flatDocFields: EsFieldName[] = [];
  const newDocFields = Object.keys(obj);
  newDocFields.forEach(f => {
    const fieldValue = obj[f];
    if (typeof fieldValue !== 'object' || fieldValue === null || Array.isArray(fieldValue)) {
      flatDocFields.push(f);
    } else {
      const innerFields = getFlattenedFields(fieldValue);
      const flattenedFields = innerFields.map(d => `${f}.${d}`);
      flatDocFields.push(...flattenedFields);
    }
  });
  return flatDocFields;
}

export const getSelectableFields = (docs: EsDoc[]): EsFieldName[] => {
  if (docs.length === 0) {
    return [];
  }

  const newDocFields = getFlattenedFields(docs[0]._source);
  newDocFields.sort();
  return newDocFields;
};

export const getDefaultSelectableFields = (docs: EsDoc[]): EsFieldName[] => {
  if (docs.length === 0) {
    return [];
  }

  const newDocFields = getFlattenedFields(docs[0]._source);
  newDocFields.sort();
  return newDocFields
    .filter(k => {
      let value = false;
      docs.forEach(row => {
        const source = row._source;
        if (source[k] !== null) {
          value = true;
        }
      });
      return value;
    })
    .slice(0, MAX_COLUMNS);
};

export const toggleSelectedField = (
  selectedFields: EsFieldName[],
  column: EsFieldName
): EsFieldName[] => {
  const index = selectedFields.indexOf(column);
  if (index === -1) {
    selectedFields.push(column);
  } else {
    selectedFields.splice(index, 1);
  }
  selectedFields.sort();
  return selectedFields;
};

export const getSourceIndexDevConsoleStatement = (
  query: SimpleQuery,
  indexPatternTitle: string
) => {
  return `GET ${indexPatternTitle}/_search\n${JSON.stringify(
    {
      query,
    },
    null,
    2
  )}\n`;
};
