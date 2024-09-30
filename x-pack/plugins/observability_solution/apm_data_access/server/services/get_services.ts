/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMEventClient } from '../lib/helpers/create_es_client/create_apm_event_client';
import { createGetDocumentSources } from './get_document_sources';
import { getDocumentTypeConfig } from './get_document_type_config';
import { createGetHostNames } from './get_host_names';
import { createGetHostServices } from './get_host_services';

export interface ApmDataAccessServicesParams {
  apmEventClient: APMEventClient;
}

export function getServices(params: ApmDataAccessServicesParams) {
  return {
    getDocumentSources: createGetDocumentSources(params),
    getHostNames: createGetHostNames(params),
    getDocumentTypeConfig,
    getHostServices: createGetHostServices(params),
  };
}
