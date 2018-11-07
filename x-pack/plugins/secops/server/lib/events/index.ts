/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventsData } from '../../../common/graphql/types';
import { FrameworkRequest } from '../framework';
export { ElasticsearchEventsAdapter } from './elasticsearch_adapter';
import { EventsAdapter, EventsRequestOptions } from './types';

export class Events {
  private adapter: EventsAdapter;

  constructor(adapter: EventsAdapter) {
    this.adapter = adapter;
  }

  public async getEvents(
    req: FrameworkRequest,
    options: EventsRequestOptions
  ): Promise<EventsData> {
    return await this.adapter.getEvents(req, options);
  }
}
