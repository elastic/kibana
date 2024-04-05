/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResultLinks } from '../../common/app';
import { lazyLoadModules } from '../lazy_load_bundle';
import type {
  DataDriftSpec,
  FileDataVisualizerSpec,
  IndexDataVisualizerSpec,
} from '../application';

export interface SpecWithLinks {
  resultLinks: ResultLinks;
  component: FileDataVisualizerSpec;
}

export function getComponents(resultLinks: ResultLinks) {
  async function getFileDataVisualizerComponent(): Promise<() => SpecWithLinks> {
    const modules = await lazyLoadModules(resultLinks);
    return () => ({ component: modules.FileDataVisualizer, resultLinks });
  }

  async function getIndexDataVisualizerComponent(): Promise<() => IndexDataVisualizerSpec> {
    const modules = await lazyLoadModules(resultLinks);
    return () => modules.IndexDataVisualizer;
  }

  async function getDataDriftComponent(): Promise<() => DataDriftSpec> {
    const modules = await lazyLoadModules(resultLinks);
    return () => modules.DataDrift;
  }
  return {
    getFileDataVisualizerComponent,
    getIndexDataVisualizerComponent,
    getDataDriftComponent,
  };
}
