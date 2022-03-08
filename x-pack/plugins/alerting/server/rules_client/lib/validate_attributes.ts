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

export const getFieldNameAttribute = (fieldName: string, attributesToIgnore: string[]) => {
  const fieldNameSplit = (fieldName || '')
    .split('.')
    .filter((fn: string) => !attributesToIgnore.includes(fn));

  return fieldNameSplit.length > 0 ? fieldNameSplit[0] : '';
};

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

export interface IterateActionProps {
  ast: KueryNode;
  index: number;
  fieldName: string;
  localFieldName: string;
}

export interface IterateFilterKureyNodeParams {
  astFilter: KueryNode;
  hasNestedKey?: boolean;
  nestedKeys?: string;
  storeValue?: boolean;
  path?: string;
  action?: (props: IterateActionProps) => void;
}

export interface ValidateFilterKueryNodeParams extends IterateFilterKureyNodeParams {
  excludedFieldNames: string[];
}

export const iterateFilterKureyNode = ({
  astFilter,
  hasNestedKey = false,
  nestedKeys,
  storeValue,
  path = 'arguments',
  action = () => {},
}: IterateFilterKureyNodeParams) => {
  let localStoreValue = storeValue;
  let localNestedKeys: string | undefined;
  let localFieldName: string = '';
  if (localStoreValue === undefined) {
    localStoreValue = astFilter.type === 'function' && astFunctionType.includes(astFilter.function);
  }

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
      iterateFilterKureyNode({
        astFilter: ast,
        storeValue: ast.type === 'function' && astFunctionType.includes(ast.function),
        path: `${myPath}.arguments`,
        hasNestedKey: ast.type === 'function' && ast.function === 'nested',
        nestedKeys: localNestedKeys || nestedKeys,
        action,
      });
    }

    if (localStoreValue) {
      const fieldName = nestedKeys != null ? `${nestedKeys}.${ast.value}` : ast.value;

      if (index === 0) {
        localFieldName = fieldName;
      }

      action({
        ast,
        index,
        fieldName,
        localFieldName,
      });
    }
  });
};

export const validateFilterKueryNode = ({
  astFilter,
  excludedFieldNames,
  hasNestedKey = false,
  nestedKeys,
  storeValue,
  path = 'arguments',
}: ValidateFilterKueryNodeParams) => {
  const action = ({ index, fieldName }: IterateActionProps) => {
    if (index === 0) {
      const firstAttribute = getFieldNameAttribute(fieldName, ['alert', 'attributes']);
      if (excludedFieldNames.includes(firstAttribute)) {
        throw new Error(`Filter is not supported on this field ${fieldName}`);
      }
    }
  };

  iterateFilterKureyNode({
    astFilter,
    hasNestedKey,
    nestedKeys,
    storeValue,
    path,
    action,
  });
};
