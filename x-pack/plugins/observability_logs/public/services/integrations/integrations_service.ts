/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationsClient } from './integrations_client';
import {
  IntegrationsServiceStartDeps,
  IntegrationsServiceSetup,
  IntegrationsServiceStart,
} from './types';

export class IntegrationsService {
  constructor() {}

  public setup(): IntegrationsServiceSetup {}

  public start({ http }: IntegrationsServiceStartDeps): IntegrationsServiceStart {
    const client = new IntegrationsClient(http);

    return {
      client,
    };
  }
}
