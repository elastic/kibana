/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode } from '@kbn/es-query';
import { get, isEmpty } from 'lodash';

import mappings from '../../saved_objects/mappings.json';

const astFunctionType = ['is', 'range', 'nested'];

export const validateOperationOnAttributes = (
  astFilter: KueryNode | null,
  sortField: string | undefined,
  searchFields: string[] | undefined,
  excludedFieldNames: string[]
) => {
  if (sortField) {
    validateSortField(sortField, excludedFieldNames);
  }
  if (!isEmpty(searchFields)) {
    validateSearchFields(searchFields ?? [], excludedFieldNames);
  }
  if (astFilter) {
    validateFilterKueryNode({ astFilter, excludedFieldNames });
  }
};

export const validateSortField = (sortField: string, excludedFieldNames: string[]) => {
  if (excludedFieldNames.filter((efn) => sortField.split('.')[0].includes(efn)).length > 0) {
    throw new Error(`Sort is not supported on this field ${sortField}`);
  }
};

export const validateSearchFields = (searchFields: string[], excludedFieldNames: string[]) => {
  const excludedSearchFields = searchFields.filter(
    (sf) => excludedFieldNames.filter((efn) => sf.split('.')[0].includes(efn)).length > 0
  );
  if (excludedSearchFields.length > 0) {
    throw new Error(`Search field ${excludedSearchFields.join()} not supported`);
  }
};

interface ValidateFilterKueryNodeParams {
  astFilter: KueryNode;
  excludedFieldNames: string[];
  hasNestedKey?: boolean;
  nestedKeys?: string;
  storeValue?: boolean;
  path?: string;
}

export const validateFilterKueryNode = ({
  astFilter,
  excludedFieldNames,
  hasNestedKey = false,
  nestedKeys,
  storeValue = false,
  path = 'arguments',
}: ValidateFilterKueryNodeParams) => {
  let localNestedKeys: string | undefined;
  astFilter.arguments.forEach((ast: KueryNode, index: number) => {
    if (hasNestedKey && ast.type === 'literal' && ast.value != null) {
      localNestedKeys = ast.value;
    } else if (ast.type === 'literal' && ast.value && typeof ast.value === 'string') {
      const key = ast.value.replace('.attributes', '');
      const mappingKey = 'properties.' + key.split('.').join('.properties.');
      const field = get(mappings, mappingKey);
      if (field != null && field.type === 'nested') {
        localNestedKeys = ast.value;
      }
    }

    if (ast.arguments) {
      const myPath = `${path}.${index}`;
      validateFilterKueryNode({
        astFilter: ast,
        excludedFieldNames,
        storeValue: ast.type === 'function' && astFunctionType.includes(ast.function),
        path: `${myPath}.arguments`,
        hasNestedKey: ast.type === 'function' && ast.function === 'nested',
        nestedKeys: localNestedKeys || nestedKeys,
      });
    }

    if (storeValue && index === 0) {
      const fieldName = nestedKeys != null ? `${nestedKeys}.${ast.value}` : ast.value;
      const fieldNameSplit = fieldName
        .split('.')
        .filter((fn: string) => !['alert', 'attributes'].includes(fn));
      const firstAttribute = fieldNameSplit.length > 0 ? fieldNameSplit[0] : '';
      if (excludedFieldNames.includes(firstAttribute)) {
        throw new Error(`Filter is not supported on this field ${fieldName}`);
      }
    }
  });
};
