/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsStart } from 'kibana/public';

export type LogViewsServiceSetup = void;

export type LogViewsServiceStart = void;

export interface LogViewsServiceCoreStart {
  savedObjects: SavedObjectsStart;
}

export class LogViewsService {
  public setup(): LogViewsServiceSetup {}
  public start(core: LogViewsServiceCoreStart): LogViewsServiceStart {
    // TODO: initialize and return client
  }
}
