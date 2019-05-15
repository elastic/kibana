/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { StaticIndexPattern } from 'ui/index_patterns';

interface KibanaContextValue {
  currentIndexPattern: StaticIndexPattern;
  indexPatterns: any;
  kibanaConfig: any;
}

// Because we're only getting the actual contextvalue within a wrapping angular component,
// we need to initialize here with `null` because TypeScript doesn't allow createContext()
// without a default value. The nullable union type takes care of allowing
// the actual required type and `null`.
export type NullableKibanaContextValue = KibanaContextValue | null;
export const KibanaContext = React.createContext<NullableKibanaContextValue>(null);

export function isKibanaContext(arg: any): arg is KibanaContextValue {
  return (
    arg.currentIndexPattern !== undefined &&
    arg.indexPatterns !== undefined &&
    arg.kibanaConfig !== undefined
  );
}
