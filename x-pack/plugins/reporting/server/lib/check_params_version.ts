/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { UNVERSIONED_VERSION } from '../../common/constants';
import type { BaseParams } from '../../common/types';

export function checkParamsVersion(jobParams: BaseParams, logger: Logger) {
  if (jobParams.version) {
    logger.debug(`Using reporting job params v${jobParams.version}`);
    return jobParams.version;
  }

  logger.warn(`No version provided in report job params. Assuming ${UNVERSIONED_VERSION}`);
  return UNVERSIONED_VERSION;
}
