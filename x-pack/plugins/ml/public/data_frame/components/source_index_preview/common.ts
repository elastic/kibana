/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dictionary } from '../../../../common/types/common';

export type EsFieldName = string;

type EsId = string;
type EsDocSource = Dictionary<any>;

export interface EsDoc extends Dictionary<any> {
  _id: EsId;
  _source: EsDocSource;
}

export const MAX_COLUMNS = 5;

export const getDefaultSelectableFields = (docs: EsDoc[]) => {
  const newDocFields = Object.keys(docs[0]._source);
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

export const toggleSelectedField = (selectedFields: EsFieldName[], column: EsFieldName) => {
  const index = selectedFields.indexOf(column);
  if (index === -1) {
    selectedFields.push(column);
  } else {
    selectedFields.splice(index, 1);
  }
  selectedFields.sort();
  return selectedFields;
};
