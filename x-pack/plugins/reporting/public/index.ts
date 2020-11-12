/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/public';
import { ScreenCapturePanelContent } from './components/screen_capture_panel_content';
import * as jobCompletionNotifications from './lib/job_completion_notifications';
import { ReportingAPIClient } from './lib/reporting_api_client';
import { ReportingPublicPlugin } from './plugin';

export interface ReportingSetup {
  components: {
    ScreenCapturePanel: typeof ScreenCapturePanelContent;
  };
}

export type ReportingStart = ReportingSetup;

export { ReportingAPIClient, ReportingPublicPlugin as Plugin, jobCompletionNotifications };

export function plugin(initializerContext: PluginInitializerContext) {
  return new ReportingPublicPlugin(initializerContext);
}
