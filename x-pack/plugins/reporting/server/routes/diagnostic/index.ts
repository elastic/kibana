/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinksServiceSetup, Logger } from '@kbn/core/server';
import type { ReportingCore } from '../../core';
import { registerDiagnoseBrowser } from './browser';
import { registerDiagnoseScreenshot } from './screenshot';

export const registerDiagnosticRoutes = (
  reporting: ReportingCore,
  logger: Logger,
  docLinks: DocLinksServiceSetup
) => {
  registerDiagnoseBrowser(reporting, logger, docLinks);
  registerDiagnoseScreenshot(reporting, logger);
};

export interface DiagnosticResponse {
  help: string[];
  success: boolean;
  logs: string;
}
