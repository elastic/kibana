/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/public';
import { ReportingPublicPlugin } from './plugin';
import * as jobCompletionNotifications from './lib/job_completion_notifications';

export function plugin(initializerContext: PluginInitializerContext) {
  return new ReportingPublicPlugin(initializerContext);
}

export { ReportingPublicPlugin as Plugin };
export { jobCompletionNotifications };
