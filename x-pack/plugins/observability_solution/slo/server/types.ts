/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import type { AlertingApiRequestHandlerContext } from '@kbn/alerting-plugin/server';
import type { CustomRequestHandlerContext, CoreRequestHandlerContext } from '@kbn/core/server';

/**
 * @internal
 */
export type SloRequestHandlerContext = CustomRequestHandlerContext<{
  licensing: LicensingApiRequestHandlerContext;
  alerting: AlertingApiRequestHandlerContext;
  core: Promise<CoreRequestHandlerContext>;
}>;
