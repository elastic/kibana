/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import React from 'react';
import { HttpStart } from 'src/core/public';
// import { FileUploadComponentProps, lazyLoadFileUploadModules } from '../lazy_load_bundle';
// import type { IImporter, ImportFactoryOptions } from '../importer';
// import { HasImportPermission } from '../../common';

export interface FileDataVisualizerStartApi {
  analyzeFile(file: string, params: Record<string, string>): Promise<any>;
}

export function getApi(http: HttpStart) {
  async function analyzeFile(file: string, params: Record<string, string> = {}): Promise<boolean> {
    const body = JSON.stringify(file);
    return await http.fetch<any>({
      path: `/internal/file_data_visualizer/analyze_file`,
      method: 'POST',
      body,
      query: params,
    });
  }

  return { analyzeFile };
}
