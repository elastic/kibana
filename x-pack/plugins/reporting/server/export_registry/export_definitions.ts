/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CSVExportType {
  locator: string;
}

export interface PNGExportType {
  locator: string;
}

export interface PDFExportType {
  locator: string;
}

// ExportType in export_registry.ts should be the umbrella type for each of these
