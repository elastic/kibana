/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportingStart } from '@kbn/reporting-plugin/public';

type ReportingModalContent = ReportingStart['components']['ReportingModalPDFV2'];
export interface CanvasReportingService {
  getReportingModalContent: () => ReportingModalContent | null;
}
