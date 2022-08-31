/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ImportFailure,
  IngestPipeline,
  ImportDoc,
  ImportResponse,
  Mappings,
  Settings,
} from '../../common/types';

export interface ImportConfig {
  settings: Settings;
  mappings: Mappings;
  pipeline: IngestPipeline;
}

export interface ImportResults {
  success: boolean;
  failures?: ImportFailure[];
  docCount?: number;
  error?: any;
}

export interface CreateDocsResponse {
  success: boolean;
  remainder: number;
  docs: ImportDoc[];
  error?: any;
}

export interface ImportFactoryOptions {
  excludeLinesPattern?: string;
  multilineStartPattern?: string;
  importConfig: ImportConfig;
}

export interface IImporter {
  read(data: ArrayBuffer): { success: boolean };
  initializeImport(
    index: string,
    settings: Settings,
    mappings: Mappings,
    pipeline: IngestPipeline
  ): Promise<ImportResponse>;
  import(
    id: string,
    index: string,
    pipelineId: string | undefined,
    setImportProgress: (progress: number) => void
  ): Promise<ImportResults>;
}
