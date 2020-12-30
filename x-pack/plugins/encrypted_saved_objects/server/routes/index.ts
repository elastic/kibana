/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import { IRouter, Logger } from '../../../../../src/core/server';
import { ConfigType } from '../config';
import { EncryptionKeyRotationService } from '../crypto';

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
