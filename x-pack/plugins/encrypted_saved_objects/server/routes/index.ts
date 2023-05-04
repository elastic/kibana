/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';

import type { ConfigType } from '../config';
import type { EncryptionKeyRotationService } from '../crypto';
import { defineKeyRotationRoutes } from './key_rotation';

/**
 * Describes parameters used to define HTTP routes.
 */
export interface RouteDefinitionParams {
  router: IRouter;
  logger: Logger;
  config: ConfigType;
  encryptionKeyRotationService: PublicMethodsOf<EncryptionKeyRotationService>;
}

export function defineRoutes(params: RouteDefinitionParams) {
  defineKeyRotationRoutes(params);
}
