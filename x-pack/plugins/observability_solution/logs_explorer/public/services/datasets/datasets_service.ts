/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetsClient } from './datasets_client';
import { DatasetsServiceSetup, DatasetsServiceStart, DatasetsServiceStartDeps } from './types';

export class DatasetsService {
  constructor() {}

  public setup(): DatasetsServiceSetup {}

  public start({ http }: DatasetsServiceStartDeps): DatasetsServiceStart {
    const client = new DatasetsClient(http);

    return {
      client,
    };
  }
}
