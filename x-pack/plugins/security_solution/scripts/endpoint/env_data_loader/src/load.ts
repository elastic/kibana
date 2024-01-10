/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { createToolingLogger } from '../../../../common/endpoint/data_loaders/utils';

interface LoadOptions {
  username: string;
  password: string;
  kibanaUrl: string;
  elasticsearchUrl: string;
  asSuperuser?: boolean;
  log?: ToolingLog;
}

export const load = (options: LoadOptions) => {
  const log = options.log ?? createToolingLogger();

  // FIXME:PT Implement load
};
