/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExternalService } from '../external_service';
import type { ActionTypes } from './common';

export interface PushedUserAction {
  type: typeof ActionTypes.pushed;
  payload: {
    externalService: ExternalService;
  };
}
