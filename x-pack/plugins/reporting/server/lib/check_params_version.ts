/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNVERSIONED_VERSION } from '../../common/constants';
import type { DecoratedBaseParams } from '../../common/types';
import type { LevelLogger } from './';

export function checkParamsVersion(jobParams: DecoratedBaseParams, logger: LevelLogger) {
  if (jobParams.version) {
    logger.debug(`Using reporting job params v${jobParams.version}`);
    return jobParams.version;
  }

  logger.warning(`No version provided in report job params. Assuming ${UNVERSIONED_VERSION}`);
  return UNVERSIONED_VERSION;
}
