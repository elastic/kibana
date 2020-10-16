/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'src/core/server';
import * as Registry from '../../registry';
import { appContextService } from '../../../app_context';

export const getAsset = (path: string): Buffer => {
  return Registry.getAsset(path);
};

export const getLogger = (): Logger => {
  return appContextService.getLogger();
};
