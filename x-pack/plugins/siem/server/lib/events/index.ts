/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EventsData,
  LastEventTimeData,
  TimelineData,
  TimelineDetailsData,
} from '../../graphql/types';
import { FrameworkRequest, RequestOptions } from '../framework';
export * from './elasticsearch_adapter';
import {
  EventsAdapter,
  EventsRequestOptions,
  LastEventTimeRequestOptions,
  RequestDetailsOptions,
} from './types';

export class Events {
  constructor(private readonly adapter: EventsAdapter) {}

  public async getEvents(req: FrameworkRequest, options: RequestOptions): Promise<EventsData> {
    return await this.adapter.getEvents(req, options);
  }

  public async getTimelineData(
    req: FrameworkRequest,
    options: EventsRequestOptions
  ): Promise<TimelineData> {
    return await this.adapter.getTimelineData(req, options);
  }

  public async getTimelineDetails(
    req: FrameworkRequest,
    options: RequestDetailsOptions
  ): Promise<TimelineDetailsData> {
    return await this.adapter.getTimelineDetails(req, options);
  }

  public async getLastEventTimeData(
    req: FrameworkRequest,
    options: LastEventTimeRequestOptions
  ): Promise<LastEventTimeData> {
    return await this.adapter.getLastEventTimeData(req, options);
  }
}
