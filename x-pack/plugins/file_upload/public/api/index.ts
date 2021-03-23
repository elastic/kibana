/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FileUploadComponentProps, lazyLoadFileUploadModules } from '../lazy_load_bundle';
import type { IImporter, ImportFactoryOptions } from '../importer';
import { HasImportPermission } from '../../common';

export interface FileUploadStartApi {
  getFileUploadComponent(): Promise<React.ComponentType<FileUploadComponentProps>>;
  importerFactory(format: string, options: ImportFactoryOptions): Promise<IImporter | undefined>;
  getMaxBytes(): number;
  getMaxBytesFormatted(): string;
  hasImportPermission(indexName?: string, checkCreateIndexPattern?: boolean): Promise<boolean>;
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

export async function hasImportPermission(
  indexName?: string,
  checkCreateIndexPattern?: boolean
): Promise<boolean> {
  const fileUploadModules = await lazyLoadFileUploadModules();
  const query: { checkCreateIndexPattern?: boolean; indexName?: string } = {};
  if (checkCreateIndexPattern !== undefined) {
    query.checkCreateIndexPattern = checkCreateIndexPattern;
  }
  if (indexName !== undefined) {
    query.indexName = indexName;
  }
  try {
    const resp = await fileUploadModules.getHttp().fetch<HasImportPermission>({
      path: `/internal/file_upload/has_import_permission`,
      method: 'GET',
      query,
    });
    return resp.hasImportPermission;
  } catch (error) {
    return false;
  }
}
