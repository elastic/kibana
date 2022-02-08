/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsClientContract } from 'src/core/server';
import { LogView } from '../../../common/log_views';
import { InfraSources } from '../../lib/sources';
import { ILogViewsClient } from './types';

export class LogViewsClient implements ILogViewsClient {
  constructor(
    private readonly logger: Logger,
    private readonly savedObjectsClient: SavedObjectsClientContract,
    private readonly infraSources: InfraSources
  ) {}

  public getLogView(logViewId: string): Promise<LogView> {
    throw new Error('Method not implemented.');
  }
}
