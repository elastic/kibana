/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilesPlugin } from './plugin';
export type { FilesSetup, FilesStart } from './plugin';
export type {
  FilesClient,
  ScopedFilesClient,
  FilesClientFactory,
  FilesClientResponses,
} from './types';
export {
  FilesContext,
  Image,
  type ImageProps,
  UploadFile,
  type UploadFileProps,
  FilePicker,
  type FilePickerProps,
} from './components';

export function plugin() {
  return new FilesPlugin();
}
