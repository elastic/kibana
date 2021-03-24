/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { IndexPatternsContract } from '../../../../../src/plugins/data/public';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';

export interface MockIndexPattern {
  id: string;
  title: string;
}

export const MockIndexPatternsKibanaContextProvider: React.FC<{
  asyncDelay: number;
  mockIndexPatterns: MockIndexPattern[];
}> = ({ asyncDelay, children, mockIndexPatterns }) => {
  const indexPatterns = useMemo(() => createIndexPatternsMock(asyncDelay, mockIndexPatterns), [
    asyncDelay,
    mockIndexPatterns,
  ]);

  return (
    <KibanaContextProvider services={{ data: { indexPatterns } }}>{children}</KibanaContextProvider>
  );
};

const createIndexPatternsMock = (
  asyncDelay: number,
  indexPatterns: MockIndexPattern[]
): Pick<IndexPatternsContract, 'getIdsWithTitle'> => {
  return {
    async getIdsWithTitle(_refresh?: boolean) {
      const indexPatterns$ = of(indexPatterns);
      return await indexPatterns$.pipe(delay(asyncDelay)).toPromise();
    },
  };
};
