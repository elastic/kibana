/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IContextProvider } from '../../../../../src/core/public';
import { DataFetcher } from './data_fetcher';

export type DataAccessHandlerProvider = (
  context: Record<string, unknown>,
  ...args: Parameters<DataFetcher>
) => ReturnType<DataFetcher>;

export interface Setup {
  registerProvider: ({
    pluginOpaqueId,
    dataType,
    handler,
    providedContext,
  }: {
    pluginOpaqueId: symbol;
    dataType: string;
    handler: DataAccessHandlerProvider;
    providedContext?: Record<string, unknown>;
  }) => void;
  registerContext: (
    pluginOpaqueId: symbol,
    contextDataType: string,
    provider: IContextProvider<DataAccessHandlerProvider, string>
  ) => void;
}
