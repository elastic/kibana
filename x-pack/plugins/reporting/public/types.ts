/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { JOB_STATUS } from '@kbn/reporting-common';
import type { JobId, ReportOutput, ReportSource, TaskRunResult } from '@kbn/reporting-common/types';
import type { SharePluginStart } from '@kbn/share-plugin/public';

/*
 * Notifier Toasts
 * @internal
 */
export interface JobSummary {
  id: JobId;
  status: JOB_STATUS;
  jobtype: ReportSource['jobtype'];
  title: ReportSource['payload']['title'];
  errorCode?: ReportOutput['error_code'];
  maxSizeReached: TaskRunResult['max_size_reached'];
  csvContainsFormulas: TaskRunResult['csv_contains_formulas'];
}

/*
 * Notifier Toasts
 * @internal
 */
export interface JobSummarySet {
  completed: JobSummary[];
  failed: JobSummary[];
}

/* Services received through useKibana context
 * @internal
 */
export interface KibanaContext {
  http: CoreSetup['http'];
  application: CoreStart['application'];
  uiSettings: CoreStart['uiSettings'];
  docLinks: CoreStart['docLinks'];
  data: DataPublicPluginStart;
  share: SharePluginStart;
}
