/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ReportingInternalSetup, ReportingInternalStart } from '@kbn/reporting-plugin/server/core';

export interface ExportTypePluginPluginSetup {
  reporting: ReportingInternalSetup;
}
export interface ExportTypePluginPluginStart {
  reporting: ReportingInternalStart;
}
