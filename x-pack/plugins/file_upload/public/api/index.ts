/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FileUploadComponentProps, lazyLoadFileUploadModules } from '../lazy_load_bundle';
import type { IImporter, ImportFactoryOptions } from '../importer';

export interface FileUploadStartApi {
  getFileUploadComponent(): Promise<React.ComponentType<FileUploadComponentProps>>;
  importerFactory(format: string, options: ImportFactoryOptions): Promise<IImporter | undefined>;
}

export async function getFileUploadComponent(): Promise<
  React.ComponentType<FileUploadComponentProps>
> {
  const fileUploadModules = await lazyLoadFileUploadModules();
  return fileUploadModules.JsonUploadAndParse;
}

export async function importerFactory(
  format: string,
  options: ImportFactoryOptions
): Promise<IImporter | undefined> {
  const fileUploadModules = await lazyLoadFileUploadModules();
  return fileUploadModules.importerFactory(format, options);
}
