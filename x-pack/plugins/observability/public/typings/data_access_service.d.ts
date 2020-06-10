/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChartDataFetcher } from '../../typings/chart';
import { IContextProvider } from '../../../../../src/core/public';

export type DataAccessHandlerProvider = (
  context: Record<string, unknown>,
  ...args: Parameters<ChartDataFetcher>
) => ReturnType<ChartDataFetcher>;

export interface Setup {
  registerProvider: (
    pluginOpaqueId: symbol,
    dataType: string,
    handler: DataAccessHandlerProvider
  ) => void;
  registerContext: (
    pluginOpaqueId: symbol,
    contextDataType: string,
    provider: IContextProvider<DataAccessHandlerProvider, string>
  ) => void;
}
