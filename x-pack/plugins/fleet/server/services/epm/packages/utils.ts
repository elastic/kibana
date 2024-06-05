/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';

import { appContextService } from '../../app_context';

const lastInstalledByUpload: Map<string, number> = new Map();

export const withPackageSpan = <T>(stepName: string, func: () => Promise<T>) =>
  withSpan({ name: stepName, type: 'package' }, func);

// Set an in memory cache to save the timestamp of latest install by upload
export const setLastUploadInstallCache = () => {
  const logger = appContextService.getLogger();
  const key = 'upload';
  const time = Date.now();
  logger.debug(`Setting timestamp ${time} to cache for install by ${key}`);
  return lastInstalledByUpload.set(key, time);
};

export const getLastUploadInstallCache = () => {
  return lastInstalledByUpload.get('upload');
};
