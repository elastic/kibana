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
  hasImportPermission(params: HasImportPermissionParams): Promise<boolean>;
  analyzeFile(file: string, params: Record<string, string>): Promise<any>;
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

interface HasImportPermissionParams {
  checkCreateIndexPattern: boolean;
  checkHasManagePipeline: boolean;
  indexName?: string;
}

export async function hasImportPermission(params: HasImportPermissionParams): Promise<boolean> {
  const fileUploadModules = await lazyLoadFileUploadModules();
  try {
    const resp = await fileUploadModules.getHttp().fetch<HasImportPermission>({
      path: `/internal/file_upload/has_import_permission`,
      method: 'GET',
      query: { ...params },
    });
    return resp.hasImportPermission;
  } catch (error) {
    return false;
  }
}

export async function analyzeFile(
  file: string,
  params: Record<string, string> = {}
): Promise<boolean> {
  const body = JSON.stringify(file);
  const fileUploadModules = await lazyLoadFileUploadModules();
  return await fileUploadModules.getHttp().fetch<any>({
    path: `/api/file_upload/analyze_file`,
    method: 'POST',
    body,
    query: params,
  });
}
