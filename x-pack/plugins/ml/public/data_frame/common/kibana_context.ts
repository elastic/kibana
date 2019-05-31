/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { IndexPattern } from 'ui/index_patterns';

export interface KibanaContextValue {
  combinedQuery: any;
  currentIndexPattern: IndexPattern;
  currentSavedSearch: any;
  indexPatterns: any;
  kbnBaseUrl: string;
  kibanaConfig: any;
}

export type SavedSearchQuery = object;

// Because we're only getting the actual contextvalue within a wrapping angular component,
// we need to initialize here with `null` because TypeScript doesn't allow createContext()
// without a default value. The nullable union type takes care of allowing
// the actual required type and `null`.
export type NullableKibanaContextValue = KibanaContextValue | null;
export const KibanaContext = React.createContext<NullableKibanaContextValue>(null);

export function isKibanaContext(arg: any): arg is KibanaContextValue {
  return (
    arg.combinedQuery !== undefined &&
    arg.currentIndexPattern !== undefined &&
    arg.currentSavedSearch !== undefined &&
    arg.indexPatterns !== undefined &&
    typeof arg.kbnBaseUrl === 'string' &&
    arg.kibanaConfig !== undefined
  );
}
