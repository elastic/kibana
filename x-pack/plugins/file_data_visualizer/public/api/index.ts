/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazyLoadModules } from '../lazy_load_bundle';
import { FileDataVisualizer } from '../application';
import { FindFileStructureResponse } from '../../common';

export interface FileDataVisualizerStartApi {
  analyzeFile(file: string, params: Record<string, string>): Promise<any>;
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

export async function getFileDataVisualizerComponent(): Promise<typeof FileDataVisualizer> {
  const modules = await lazyLoadModules();
  return modules.FileDataVisualizer;
}
