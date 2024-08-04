/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ApmDataAccessServicesParams } from '../get_services';
import { getDocumentSources, type DocumentSourcesRequest } from './get_document_sources';

export function createGetDocumentSources({ apmEventClient }: ApmDataAccessServicesParams) {
  return async ({
    enableContinuousRollups,
    enableServiceTransactionMetrics,
    end,
    kuery,
    start,
  }: Omit<DocumentSourcesRequest, 'apmEventClient'>) => {
    return getDocumentSources({
      apmEventClient,
      enableContinuousRollups,
      enableServiceTransactionMetrics,
      end,
      kuery,
      start,
    });
  };
}

export { getDocumentSources, type DocumentSourcesRequest };
