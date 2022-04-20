/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { Logger } from '@kbn/core/server';
import { readMemoryLimit } from './read_cgroup_mem_limit';

const MIN_CLOUD_OS_MEM_GB: number = 2;
const MIN_CLOUD_OS_MEM_BYTES: number = MIN_CLOUD_OS_MEM_GB * Math.pow(1024, 3);

/**
 * If we are on Cloud we need to ensure that we have sufficient memory available,
 * if we do not Chromium cannot start. See {@link MIN_CLOUD_OS_MEM_BYTES}.
 *
 */
export function systemHasInsufficientMemory(
  cloud: undefined | CloudSetup,
  logger: Logger
): boolean {
  if (!Boolean(cloud?.isCloudEnabled || cloud?.deploymentId)) return false;
  const limit = readMemoryLimit();
  logger.info(`Memory limit from cgroup (in bytes): ${limit}`);
  return limit < MIN_CLOUD_OS_MEM_BYTES;
}
