/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HttpApiInterfaceEntryDefinition,
  CreateHttpEndpoint,
  DeleteHttpEndpoint,
  DownloadHttpEndpoint,
  GetByIdHttpEndpoint,
  ListHttpEndpoint,
  UpdateHttpEndpoint,
  UploadHttpEndpoint,
} from '../common/api_routes';

type ClientMethodFrom<E extends HttpApiInterfaceEntryDefinition> = (
  args: E['inputs']['body'] & E['inputs']['params'] & E['inputs']['query']
) => Promise<E['output']>;

export interface FilesClient {
  create: ClientMethodFrom<CreateHttpEndpoint>;
  delete: ClientMethodFrom<DeleteHttpEndpoint>;
  download: ClientMethodFrom<DownloadHttpEndpoint>;
  getById: ClientMethodFrom<GetByIdHttpEndpoint>;
  list: ClientMethodFrom<ListHttpEndpoint>;
  update: ClientMethodFrom<UpdateHttpEndpoint>;
  upload: ClientMethodFrom<UploadHttpEndpoint>;
}

export interface FilesClientFactory {
  asScoped(fileKind: string): FilesClient;
}
