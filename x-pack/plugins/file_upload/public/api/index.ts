/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazyLoadModules } from '../lazy_load_bundle';
import type { IImporter, ImportFactoryOptions } from '../importer';
import type { HasImportPermission, FindFileStructureResponse } from '../../common/types';
import type { getMaxBytes, getMaxBytesFormatted } from '../importer/get_max_bytes';
import { GeoUploadWizardAsyncWrapper } from './geo_upload_wizard_async_wrapper';
import { IndexNameFormAsyncWrapper } from './index_name_form_async_wrapper';

export interface FileUploadStartApi {
  FileUploadComponent: typeof GeoUploadWizardAsyncWrapper;
  IndexNameFormComponent: typeof IndexNameFormAsyncWrapper;
  importerFactory: typeof importerFactory;
  getMaxBytes: typeof getMaxBytes;
  getMaxBytesFormatted: typeof getMaxBytesFormatted;
  hasImportPermission: typeof hasImportPermission;
  checkIndexExists: typeof checkIndexExists;
  getTimeFieldRange: typeof getTimeFieldRange;
  analyzeFile: typeof analyzeFile;
}

export interface GetTimeFieldRangeResponse {
  success: boolean;
  start: { epoch: number; string: string };
  end: { epoch: number; string: string };
}

export const FileUploadComponent = GeoUploadWizardAsyncWrapper;
export const IndexNameFormComponent = IndexNameFormAsyncWrapper;

export async function importerFactory(
  format: string,
  options: ImportFactoryOptions
): Promise<IImporter | undefined> {
  const fileUploadModules = await lazyLoadModules();
  return fileUploadModules.importerFactory(format, options);
}

interface HasImportPermissionParams {
  checkCreateIndexPattern: boolean;
  checkHasManagePipeline: boolean;
  indexName?: string;
}

export async function analyzeFile(
  file: string,
  params: Record<string, string> = {}
): Promise<FindFileStructureResponse> {
  const { getHttp } = await lazyLoadModules();
  const body = JSON.stringify(file);
  return await getHttp().fetch<FindFileStructureResponse>({
    path: `/internal/file_data_visualizer/analyze_file`,
    method: 'POST',
    body,
    query: params,
  });
}

export async function hasImportPermission(params: HasImportPermissionParams): Promise<boolean> {
  const fileUploadModules = await lazyLoadModules();
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

export async function checkIndexExists(
  index: string,
  params: Record<string, string> = {}
): Promise<boolean> {
  const body = JSON.stringify({ index });
  const fileUploadModules = await lazyLoadModules();
  try {
    const { exists } = await fileUploadModules.getHttp().fetch<{ exists: boolean }>({
      path: `/internal/file_upload/index_exists`,
      method: 'POST',
      body,
      query: params,
    });
    return exists;
  } catch (error) {
    return false;
  }
}

export async function getTimeFieldRange(index: string, query: unknown, timeFieldName?: string) {
  const body = JSON.stringify({ index, timeFieldName, query });

  const fileUploadModules = await lazyLoadModules();
  return await fileUploadModules.getHttp().fetch<GetTimeFieldRangeResponse>({
    path: `/internal/file_upload/time_field_range`,
    method: 'POST',
    body,
  });
}
