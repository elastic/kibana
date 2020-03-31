/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { http } from '../http_service';

import { basePath } from './index';

export const fileDatavisualizer = {
  analyzeFile(file: string, params: Record<string, string> = {}) {
    const body = JSON.stringify(file);
    return http<any>({
      path: `${basePath()}/file_data_visualizer/analyze_file`,
      method: 'POST',
      body,
      query: params,
    });
  },

  import({
    id,
    index,
    data,
    settings,
    mappings,
    ingestPipeline,
  }: {
    id: string;
    index: string;
    data: any;
    settings: any;
    mappings: any;
    ingestPipeline: any;
  }) {
    const query = id !== undefined ? { id } : {};
    const body = JSON.stringify({
      index,
      data,
      settings,
      mappings,
      ingestPipeline,
    });

    return http<any>({
      path: `${basePath()}/file_data_visualizer/import`,
      method: 'POST',
      query,
      body,
    });
  },
};
