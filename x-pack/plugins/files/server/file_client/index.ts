/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { EsIndexFilesMetadataClient, SavedObjectsFileMetadataClient } from './file_metadata_client';
export type { FileMetadataClient } from './file_metadata_client';
export { FileClient } from './file_client';
export { createEsFileClient, CreateEsFileClientArgs } from './create_es_file_client';
export type { FileDescriptor } from './file_metadata_client';
