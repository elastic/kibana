/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, type MutableRefObject } from 'react';
import type { UseQueryResult } from 'react-query';

interface FindingsEsPitContextValue {
  setPitId(newPitId: string): void;
  pitIdRef: MutableRefObject<string>;
  pitQuery: UseQueryResult<string>;
}

// Default value should never be used, it can not be instantiated statically. Always wrap in a provider with a value
export const FindingsEsPitContext = createContext<FindingsEsPitContextValue>(
  {} as FindingsEsPitContextValue
);
