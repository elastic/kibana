/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { CasesClient } from '@kbn/cases-plugin/server';
import type { Logger } from '@kbn/logging';
import type { EndpointAppContext } from '../../types';
import type { ActionDetails } from '../../../../common/endpoint/types';
import type { BaseActionV2RequestBody } from '../../../../common/api/endpoint';
import type { ResponseActionsProvider } from './types';

export interface BaseActionsProviderOptions {
  endpointContext: EndpointAppContext;
  esClient: ElasticsearchClient;
  casesClient: CasesClient;
  /** Username that will be stored along with the action's ES documents */
  username: string;
}

export abstract class BaseActionsProvider implements ResponseActionsProvider {
  protected readonly log: Logger;

  constructor(protected readonly options: BaseActionsProviderOptions) {
    this.log = options.endpointContext.logFactory.get(this.constructor.name);
  }

  public abstract isolate(options: BaseActionV2RequestBody): Promise<ActionDetails>;
  public abstract release(options: BaseActionV2RequestBody): Promise<ActionDetails>;
}
