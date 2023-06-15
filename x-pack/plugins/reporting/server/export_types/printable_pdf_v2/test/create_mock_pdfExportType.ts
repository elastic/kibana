/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createMockConfigSchema, createMockReportingCore } from '../../../test_helpers';
import { PdfExportType, PdfExportTypeSetupDeps } from '..';

export const mockPdfExportType: Partial<PdfExportType> = {};

const mockReportingCore = createMockReportingCore;

