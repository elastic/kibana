/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmDataAccessServicesParams } from '../get_services';
import { getDocumentSources, type DocumentSourcesRequest } from './get_document_sources';

export function createGetDocumentSources({ apmEventClient }: ApmDataAccessServicesParams) {
  return async ({ end, kuery, start }: Omit<DocumentSourcesRequest, 'apmEventClient'>) => {
    return getDocumentSources({
      apmEventClient,
      end,
      kuery,
      start,
    });
  };
}

export { getDocumentSources, type DocumentSourcesRequest };
