/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KueryNode } from '@kbn/es-query';
import { SuggestionsAbstraction } from '@kbn/unified-search-plugin/public/typeahead/suggestions_component';
import { alertMappings } from '@kbn/alerting-plugin/common';
import { get } from 'lodash';

const astFunctionType = ['is', 'range', 'nested'];

export interface IterateFieldsKueryNodeParams {
  astFilter: KueryNode;
  suggestionsAbstraction: SuggestionsAbstraction;
  hasNestedKey?: boolean;
  nestedKeys?: string;
  storeValue?: boolean;
  path?: string;
  action?: (args: IterateActionProps) => void;
}

export interface IterateActionProps {
  ast: KueryNode;
  index: number;
  fieldName: string;
}

export const validateFieldsKueryNode = ({
  astFilter,
  suggestionsAbstraction,
}: {
  astFilter: KueryNode;
  suggestionsAbstraction: SuggestionsAbstraction;
}) => {
  const fields = Object.values(suggestionsAbstraction.fields).reduce<string[]>((acc, saf) => {
    if (saf.displayField && !acc.includes(saf.displayField)) {
      acc.push(saf.displayField);
    }
    if (
      saf.displayField &&
      saf.nestedDisplayField &&
      !acc.includes(`${saf.displayField}.${saf.nestedDisplayField}`)
    ) {
      acc.push(`${saf.displayField}.${saf.nestedDisplayField}`);
    }
    return acc;
  }, []);
  const action = ({ ast, index, fieldName }: IterateActionProps) => {
    if (index === 0) {
      if (!fields.includes(fieldName)) {
        throw new Error(`Filter is not supported on this field "${fieldName}"`);
      }
    }
    if (suggestionsAbstraction.fields[fieldName]) {
      ast.value = suggestionsAbstraction.fields[fieldName].fieldToQuery;
    }
  };

  iterateFieldsKueryNode({
    astFilter,
    suggestionsAbstraction,
    action,
  });
};

const iterateFieldsKueryNode = ({
  astFilter,
  suggestionsAbstraction,
  hasNestedKey = false,
  nestedKeys,
  storeValue,
  path = 'arguments',
  action = () => {},
}: IterateFieldsKueryNodeParams) => {
  let localStoreValue = storeValue;
  let localNestedKeys: string | undefined;
  if (localStoreValue === undefined) {
    localStoreValue = astFilter.type === 'function' && astFunctionType.includes(astFilter.function);
  }
  if (astFilter.type === 'function' && astFilter.function === 'nested') {
    hasNestedKey = true;
  }

  astFilter.arguments.forEach((ast: KueryNode, index: number) => {
    if (index === 0) {
      if (hasNestedKey && ast.type === 'literal' && ast.value != null) {
        localNestedKeys = ast.value;
      } else if (ast.type === 'literal' && ast.value && typeof ast.value === 'string') {
        const key = suggestionsAbstraction.fields[ast.value]
          ? suggestionsAbstraction.fields[ast.value].field
          : ast.value;
        const mappingKey = 'properties.' + key.split('.').join('.properties.');
        const field = get(alertMappings, mappingKey);
        if (field != null && field.type === 'nested') {
          localNestedKeys = ast.value;
        }
      }
    }

    if (ast.arguments) {
      const myPath = `${path}.${index}`;
      iterateFieldsKueryNode({
        astFilter: ast,
        suggestionsAbstraction,
        storeValue: ast.type === 'function' && astFunctionType.includes(ast.function),
        path: `${myPath}.arguments`,
        hasNestedKey: ast.type === 'function' && ast.function === 'nested',
        nestedKeys: localNestedKeys || nestedKeys,
        action,
      });
    }

    if (localStoreValue) {
      const fieldName = nestedKeys != null ? `${nestedKeys}.${ast.value}` : ast.value;

      action({
        ast,
        index,
        fieldName,
      });
    }
  });
};
