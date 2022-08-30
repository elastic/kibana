/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockedIndexPattern, createMockedRestrictedIndexPattern } from '../mocks';
import { IndexPatternPrivateState } from '../types';

export function loadInitialState() {
  const indexPattern = createMockedIndexPattern();
  const result: IndexPatternPrivateState = {
    currentIndexPatternId: indexPattern.id,
    layers: {},
  };
  return result;
}

const originalLoader = jest.requireActual('../loader');

export const extractReferences = originalLoader.extractReferences;

export const injectReferences = originalLoader.injectReferences;

export function loadInitialDataViews() {
  const indexPattern = createMockedIndexPattern();
  const restricted = createMockedRestrictedIndexPattern();
  return {
    indexPatternRefs: [],
    existingFields: {},
    indexPatterns: {
      [indexPattern.id]: indexPattern,
      [restricted.id]: restricted,
    },
    isFirstExistenceFetch: false,
  };
}
