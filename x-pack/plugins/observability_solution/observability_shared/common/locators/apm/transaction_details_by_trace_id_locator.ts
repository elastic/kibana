/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';

export const TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR = 'TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR';

export interface TransactionDetailsByTraceIdLocatorParams extends SerializableRecord {
  traceId: string;
}

export type TransactionDetailsByTraceIdLocator =
  LocatorPublic<TransactionDetailsByTraceIdLocatorParams>;

export class TransactionDetailsByTraceIdLocatorDefinition
  implements LocatorDefinition<TransactionDetailsByTraceIdLocatorParams>
{
  public readonly id = TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR;

  public readonly getLocation = async ({ traceId }: TransactionDetailsByTraceIdLocatorParams) => {
    return {
      app: 'apm',
      path: `/link-to/trace/${encodeURIComponent(traceId)}`,
      state: {},
    };
  };
}
