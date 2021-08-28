/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FileDataVisualizerSpec } from '../application/file_data_visualizer/file_data_visualizer';
import type { IndexDataVisualizerSpec } from '../application/index_data_visualizer/index_data_visualizer';
import { lazyLoadModules } from '../lazy_load_bundle';

export async function getFileDataVisualizerComponent(): Promise<() => FileDataVisualizerSpec> {
  const modules = await lazyLoadModules();
  return () => modules.FileDataVisualizer;
}

export async function getIndexDataVisualizerComponent(): Promise<() => IndexDataVisualizerSpec> {
  const modules = await lazyLoadModules();
  return () => modules.IndexDataVisualizer;
}
