/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import os from 'os';
import type { Logger } from 'src/core/server';
import type { CloudSetup } from '../../../cloud/server';

const MIN_CLOUD_OS_MEM_GB: number = 2;
const MIN_CLOUD_OS_MEM_BYTES: number = MIN_CLOUD_OS_MEM_GB * Math.pow(1024, 3);

/**
 * If we are on Cloud we need to ensure that we have sufficient memory available,
 * if we do not Chromium cannot start. See {@link MIN_CLOUD_OS_MEM_BYTES}.
 */
export function systemHasInsufficientMemory(logger: Logger, cloud?: CloudSetup): boolean {
  return (
    Boolean(cloud?.isCloudEnabled || cloud?.deploymentId) && os.totalmem() < MIN_CLOUD_OS_MEM_BYTES
  );
}
