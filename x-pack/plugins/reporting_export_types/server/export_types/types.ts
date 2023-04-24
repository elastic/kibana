/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CsvConfig } from '@kbn/generate-csv-types';
import {
  CreateJobFn,
  RunTaskFn,
  CreateJobFnFactory,
  RunTaskFnFactory,
} from '@kbn/reporting-plugin/server/types';

export interface CSVExportType {
  // locator or id
  id: string;
  /**
   * should default to true based on reporting/server/config/schema.ts
   * This might not be needed tbd based on the direction of serverless
   */
  enabledBySchema: boolean;
  // need to investigate how this is populated and the equivalent for other export types
  config: CsvConfig;
}

export interface PNGExportType {
  id: string;
  enabledBySchema: boolean;
}

export interface PDFExportType {
  id: string;
  enabledBySchema: boolean;
}

// Creating this type to be used when the entries aren't yet sorted into the export types
// export type ExportTypeDefinition = Partial<CSVExportType | PNGExportType | PDFExportType>;

// ExportTypeDefintion interface in reporting/server/types.ts
export interface ExportTypeDefinition<
  CreateJobFnType = CreateJobFn | null,
  RunTaskFnType = RunTaskFn
> {
  id: string;
  name: string;
  jobType: string;
  jobContentEncoding?: string;
  jobContentExtension: string;
  createJobFnFactory: CreateJobFnFactory<CreateJobFnType> | null; // immediate job does not have a "create" phase
  runTaskFnFactory: RunTaskFnFactory<RunTaskFnType>;
  validLicenses: string[];
}
