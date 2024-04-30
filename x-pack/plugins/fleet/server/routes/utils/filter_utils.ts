/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import * as esKuery from '@kbn/es-query';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';

import { appContextService } from '../../services/app_context';

type KueryNode = any;

const astFunctionType = ['is', 'range', 'nested'];
const allowedTerms = ['_exists_'];

interface ValidateFilterKueryNode {
  astPath: string;
  error: string;
  isSavedObjectAttr: boolean;
  key: string;
  type: string | null;
}

interface ValidateFilterKueryNodeParams {
  astFilter: KueryNode;
  types: string[];
  indexMapping: IndexMapping;
  hasNestedKey?: boolean;
  nestedKeys?: string;
  storeValue?: boolean;
  path?: string;
  skipNormalization?: boolean;
}

export const validateFilterKueryNode = ({
  astFilter,
  types,
  indexMapping,
  hasNestedKey = false,
  nestedKeys,
  storeValue = false,
  path = 'arguments',
  skipNormalization,
}: ValidateFilterKueryNodeParams): ValidateFilterKueryNode[] => {
  let localNestedKeys: string | undefined;
  return astFilter.arguments.reduce((kueryNode: string[], ast: KueryNode, index: number) => {
    if (hasNestedKey && ast.type === 'literal' && ast.value != null) {
      localNestedKeys = ast.value;
    } else if (ast.type === 'literal' && ast.value && typeof ast.value === 'string') {
      const key = ast.value.replace('.attributes', '');
      const mappingKey = 'properties.' + key.split('.').join('.properties.');
      const field = get(indexMapping, mappingKey);

      if (field != null && field.type === 'nested') {
        localNestedKeys = ast.value;
      }
    }

    if (ast.arguments) {
      const myPath = `${path}.${index}`;
      return [
        ...kueryNode,
        ...validateFilterKueryNode({
          astFilter: ast,
          types,
          indexMapping,
          storeValue: ast.type === 'function' && astFunctionType.includes(ast.function),
          path: `${myPath}.arguments`,
          hasNestedKey: ast.type === 'function' && ast.function === 'nested',
          nestedKeys: localNestedKeys || nestedKeys,
          skipNormalization,
        }),
      ];
    }
    if (storeValue && index === 0) {
      const splitPath = path.split('.');
      const astPath = path.includes('.')
        ? splitPath.slice(0, splitPath.length - 1).join('.')
        : `${path}.${index}`;
      const key = nestedKeys != null ? `${nestedKeys}.${ast.value}` : ast.value;

      return [
        ...kueryNode,
        {
          astPath,
          error: hasFilterKeyError(key, types, indexMapping, skipNormalization),
          isSavedObjectAttr: isSavedObjectAttr(key, indexMapping),
          key,
          type: getType(key),
        },
      ];
    }
    return kueryNode;
  }, []);
};

const getType = (key: string | undefined | null) => {
  if (key != null && key.includes('.')) {
    return key.split('.')[0];
  } else if (allowedTerms.some((term) => term === key)) {
    return 'searchTerm';
  } else {
    return null;
  }
};

/**
 * Is this filter key referring to a a top-level SavedObject attribute such as
 * `updated_at` or `references`.
 *
 * @param key
 * @param indexMapping
 */
export const isSavedObjectAttr = (key: string | null | undefined, indexMapping: IndexMapping) => {
  const keySplit = key != null ? key.split('.') : [];
  if (keySplit.length === 1 && fieldDefined(indexMapping, keySplit[0])) {
    return true;
  } else if (keySplit.length === 2 && keySplit[1] === 'id') {
    return true;
  } else if (keySplit.length === 2 && fieldDefined(indexMapping, keySplit[1])) {
    return true;
  } else {
    return false;
  }
};

export const hasFilterKeyError = (
  key: string | null | undefined,
  types: string[],
  indexMapping: IndexMapping,
  skipNormalization?: boolean
): string | null => {
  if (!key) {
    return `Invalid key`;
  }
  if (!key.includes('.')) {
    if (allowedTerms.some((term) => term === key) || fieldDefined(indexMapping, key)) {
      return null;
    }
    return `This type '${key}' is not allowed`;
  } else if (key.includes('.')) {
    const keySplit = key.split('.');
    const firstField = keySplit[0];
    const hasIndexWrap = types.includes(firstField);

    if (keySplit.length <= 1 && !fieldDefined(indexMapping, firstField) && !hasIndexWrap) {
      return `This type '${firstField}' is not allowed`;
    }
    // In some cases we don't want to check about the `attributes` presence
    // In that case pass the `skipNormalization` parameter
    if (
      (!skipNormalization && keySplit.length === 2 && fieldDefined(indexMapping, key)) ||
      (!skipNormalization && keySplit.length > 2 && keySplit[1] !== 'attributes')
    ) {
      return `This key '${key}' does NOT match the filter proposition SavedObjectType.attributes.key`;
    }
    // Check that the key exists in the mappings
    let searchKey = '';
    if (keySplit.length === 2) {
      searchKey = hasIndexWrap ? keySplit[1] : key;
    } else if (keySplit.length > 2) {
      searchKey =
        skipNormalization || keySplit[1] !== 'attributes'
          ? `${firstField}.${keySplit.slice(1, keySplit.length).join('.')}`
          : `${firstField}.${keySplit.slice(2, keySplit.length).join('.')}`;
    }
    if (!fieldDefined(indexMapping, searchKey)) {
      return `This key '${key}' does NOT exist in ${types.join()} saved object index patterns`;
    }
  }
  return null;
};

const getMappingKey = (key?: string) =>
  !!key ? 'properties.' + key.split('.').join('.properties.') : '';

export const fieldDefined = (indexMappings: IndexMapping, key: string): boolean => {
  const keySplit = key.split('.');
  const shortenedKey = `${keySplit[1]}.${keySplit.slice(2, keySplit.length).join('.')}`;
  const mappingKey = getMappingKey(key);

  if (
    !!get(indexMappings, mappingKey) ||
    !!get(indexMappings, getMappingKey(shortenedKey)) ||
    mappingKey === 'properties.id'
  ) {
    return true;
  }

  // If the `mappingKey` does not match a valid path, before returning false,
  // we want to check and see if the intended path was for a multi-field
  // such as `x.attributes.field.text` where `field` is mapped to both text
  // and keyword
  const propertiesAttribute = 'properties';
  const indexOfLastProperties = mappingKey.lastIndexOf(propertiesAttribute);
  const fieldMapping = mappingKey.substr(0, indexOfLastProperties);
  const fieldType = mappingKey.substr(
    mappingKey.lastIndexOf(propertiesAttribute) + `${propertiesAttribute}.`.length
  );
  const mapping = `${fieldMapping}fields.${fieldType}`;
  if (!!get(indexMappings, mapping)) {
    return true;
  }

  // If the path is for a flattened type field, we'll assume the mappings are defined.
  const keys = key.split('.');
  for (let i = 0; i < keys.length; i++) {
    const path = `properties.${keys.slice(0, i + 1).join('.properties.')}`;
    if (get(indexMappings, path)?.type === 'flattened') {
      return true;
    }
  }

  return false;
};

export const validateKuery = (
  kuery: string | undefined,
  allowedTypes: string[],
  indexMapping: IndexMapping,
  skipNormalization?: boolean
) => {
  let isValid = true;
  let error: string | undefined;
  const { enableStrictKQLValidation } = appContextService.getExperimentalFeatures();

  // Skip validation when enableStrictKQLValidation is disabled
  if (!enableStrictKQLValidation) {
    return { isValid, error };
  }
  if (!kuery) {
    isValid = true;
  }
  try {
    if (kuery && indexMapping) {
      const astFilter = esKuery.fromKueryExpression(kuery);
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: allowedTypes,
        indexMapping,
        storeValue: true,
        skipNormalization,
      });
      if (validationObject.some((obj) => obj.error != null)) {
        error = `KQLSyntaxError: ${validationObject
          .filter((obj) => obj.error != null)
          .map((obj) => obj.error)
          .join('\n')}`;
        isValid = false;
      }
    } else {
      isValid = true;
    }
    return { isValid, error };
  } catch (e) {
    isValid = false;
    error = e.message;
  }
};
