/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// File storage indexes supporting file upload from the host to Elastic/Kibana
// If needing to get an integration specific index name, use the utility functions
// found in `common/services/file_storage`
export const FILE_STORAGE_METADATA_INDEX_PATTERN = '.fleet-fileds-fromhost-meta-*';
export const FILE_STORAGE_DATA_INDEX_PATTERN = '.fleet-fileds-fromhost-data-*';

// File storage indexes supporting user uploaded files (via kibana) that will be
// delivered to the host agent/endpoint
export const FILE_STORAGE_TO_HOST_METADATA_INDEX_PATTERN = '.fleet-fileds-tohost-meta-*';
export const FILE_STORAGE_TO_HOST_DATA_INDEX_PATTERN = '.fleet-fileds-tohost-data-*';

// which integrations support file upload and the name to use for the file upload index
export const FILE_STORAGE_INTEGRATION_INDEX_NAMES: Readonly<
  Record<
    string,
    Readonly<{
      /** name to be used for the index */
      name: string;
      /** If integration supports files sent from host to ES/Kibana */
      fromHost: boolean;
      /** If integration supports files to be sent to host from kibana */
      toHost: boolean;
    }>
  >
> = {
  elastic_agent: { name: 'agent', fromHost: true, toHost: false },
  endpoint: { name: 'endpoint', fromHost: true, toHost: true },
};
export const FILE_STORAGE_INTEGRATION_NAMES: Readonly<string[]> = Object.keys(
  FILE_STORAGE_INTEGRATION_INDEX_NAMES
);
