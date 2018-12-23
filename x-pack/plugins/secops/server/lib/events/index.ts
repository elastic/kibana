/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventsData } from '../../graphql/types';
import { FrameworkRequest } from '../framework';
export * from './elasticsearch_adapter';
import { EventsAdapter, EventsRequestOptions } from './types';

export class Events {
  constructor(private readonly adapter: EventsAdapter) {}

  public async getEvents(
    req: FrameworkRequest,
    options: EventsRequestOptions
  ): Promise<EventsData> {
    return await this.adapter.getEvents(req, options);
  }
}
