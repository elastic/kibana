/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseRunningService } from './base_running_service';

/**
 * Base class for start/stopping background services
 */
export class ActionResponder extends BaseRunningService {
  protected async run(): Promise<void> {
    //
  }
}
