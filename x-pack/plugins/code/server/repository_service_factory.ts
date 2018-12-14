/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Log } from './log';
import { RepositoryService } from './repository_service';

export class RepositoryServiceFactory {
  public newInstance(dataPath: string, log: Log): RepositoryService {
    return new RepositoryService(dataPath, log);
  }
}
