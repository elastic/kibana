/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { decryptJobHeaders } from '@kbn/reporting-common';
export { getFullUrls } from './get_full_urls';
export { validateUrls } from './validate_urls';
export { generatePngObservable } from './generate_png';
export { ExportType, getCustomLogo } from '@kbn/reporting-common';
export type { BaseExportTypeSetupDeps, BaseExportTypeStartDeps } from '@kbn/reporting-common';

export interface TimeRangeParams {
  min?: Date | string | number | null;
  max?: Date | string | number | null;
}
