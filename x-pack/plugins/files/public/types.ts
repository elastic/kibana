/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HttpApiInterfaceEntryDefinition,
  CreateFileKindHttpEndpoint,
  DeleteFileKindHttpEndpoint,
  DownloadFileKindHttpEndpoint,
  GetByIdFileKindHttpEndpoint,
  ListFileKindHttpEndpoint,
  UpdateFileKindHttpEndpoint,
  UploadFileKindHttpEndpoint,
} from '../common/api_routes';

type ClientMethodFrom<E extends HttpApiInterfaceEntryDefinition> = (
  args: E['inputs']['body'] & E['inputs']['params'] & E['inputs']['query']
) => Promise<E['output']>;

export interface FilesClient {
  create: ClientMethodFrom<CreateFileKindHttpEndpoint>;
  delete: ClientMethodFrom<DeleteFileKindHttpEndpoint>;
  download: ClientMethodFrom<DownloadFileKindHttpEndpoint>;
  getById: ClientMethodFrom<GetByIdFileKindHttpEndpoint>;
  list: ClientMethodFrom<ListFileKindHttpEndpoint>;
  update: ClientMethodFrom<UpdateFileKindHttpEndpoint>;
  upload: ClientMethodFrom<UploadFileKindHttpEndpoint>;
}

export interface FilesClientFactory {
  asScoped(fileKind: string): FilesClient;
}
