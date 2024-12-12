/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { OBSERVABLE_TYPES_BUILTIN } from '../../common/constants';
import { type CasesClient } from './client';
import { getAvailableObservableTypesSet } from './observable_types';

/**
 * Throws an error if the request has custom fields with duplicated keys.
 */
export const validateDuplicatedKeysInRequest = ({
  requestFields = [],
  fieldName,
}: {
  requestFields?: Array<{ key: string }>;
  fieldName: string;
}) => {
  const uniqueKeys = new Set<string>();
  const duplicatedKeys = new Set<string>();

  requestFields.forEach((item) => {
    if (uniqueKeys.has(item.key)) {
      duplicatedKeys.add(item.key);
    } else {
      uniqueKeys.add(item.key);
    }
  });

  if (duplicatedKeys.size > 0) {
    throw Boom.badRequest(
      `Invalid duplicated ${fieldName} keys in request: ${Array.from(duplicatedKeys.values())}`
    );
  }
};

/**
 * Throws an error if the request has observable types with duplicated labels.
 */
export const validateDuplicatedObservableTypesInRequest = ({
  requestFields = [],
}: {
  requestFields?: Array<{ label: string }>;
}) => {
  const stringifyItem = (item: { label: string }) => item.label.toLowerCase();

  // NOTE: this prevents adding duplicates for the builtin types
  const builtinLabels = OBSERVABLE_TYPES_BUILTIN.map(stringifyItem);

  const uniqueLabels = new Set<string>(builtinLabels);
  const duplicatedLabels = new Set<string>();

  requestFields.forEach((item) => {
    const stringifiedItem = stringifyItem(item);
    if (uniqueLabels.has(stringifiedItem)) {
      duplicatedLabels.add(stringifiedItem);
    } else {
      uniqueLabels.add(stringifiedItem);
    }
  });

  if (duplicatedLabels.size > 0) {
    throw Boom.badRequest(
      `Invalid duplicated observable types in request: ${Array.from(duplicatedLabels.values())}`
    );
  }
};

/**
 * Throws an error if the request has observable types with duplicated labels.
 */
export const validateDuplicatedObservablesInRequest = ({
  requestFields = [],
}: {
  requestFields?: Array<{ typeKey: string; value: string }>;
}) => {
  const stringifyItem = (item: { value: string; typeKey: string }) =>
    [item.typeKey, item.value].join();

  const uniqueObservables = new Set<string>();
  const duplicatedObservables = new Set<string>();

  requestFields.forEach((item) => {
    if (uniqueObservables.has(stringifyItem(item))) {
      duplicatedObservables.add(stringifyItem(item));
    } else {
      uniqueObservables.add(stringifyItem(item));
    }
  });

  if (duplicatedObservables.size > 0) {
    throw Boom.badRequest(`Invalid duplicated observables in request.`);
  }
};

/**
 * Throws an error if observable type key is not valid
 */
export const validateObservableTypeKeyExists = async (
  casesClient: CasesClient,
  {
    caseOwner,
    observableTypeKey,
  }: {
    caseOwner: string;
    observableTypeKey: string;
  }
) => {
  const observableTypesSet = await getAvailableObservableTypesSet(casesClient, caseOwner);
  if (!observableTypesSet.has(observableTypeKey)) {
    throw Boom.badRequest(`Invalid observable type, key does not exist: ${observableTypeKey}`);
  }
};
