/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GetResponse, SearchResponse } from 'elasticsearch';
import { RequestHandlerContext } from 'src/core/server';
import { AlertEvent, AlertHits, Direction } from '../../../../../common/types';
import { EndpointConfigType } from '../../../../config';
import { searchESForAlerts, Pagination } from '../../lib';
import { AlertSearchQuery, SearchCursor, AlertDetailsRequestParams } from '../../types';
import { BASE_ALERTS_ROUTE } from '../..';

/**
 * Pagination class for alert details.
 */
export class AlertDetailsPagination extends Pagination<
  AlertDetailsRequestParams,
  GetResponse<AlertEvent>
> {
  constructor(
    config: EndpointConfigType,
    requestContext: RequestHandlerContext,
    state: AlertDetailsRequestParams,
    data: GetResponse<AlertEvent>
  ) {
    super(config, requestContext, state, data);
  }

  protected async doSearch(
    direction: Direction,
    cursor: SearchCursor
  ): Promise<SearchResponse<AlertEvent>> {
    const reqData: AlertSearchQuery = {
      pageSize: 1,
      sort: '@timestamp',
      order: 'desc',
    };

    if (direction === 'asc') {
      reqData.searchAfter = cursor;
    } else {
      reqData.searchBefore = cursor;
    }

    const response = await searchESForAlerts(
      this.requestContext.core.elasticsearch.dataClient,
      reqData
    );
    return response;
  }

  protected getUrlFromHits(hits: AlertHits): string | null {
    if (hits.length > 0) {
      return `${BASE_ALERTS_ROUTE}/${hits[0]._id}`;
    }
    return null;
  }

  /**
   * Gets the next alert after this one.
   */
  async getNextUrl(): Promise<string | null> {
    const response = await this.doSearch('asc', [
      this.data._source['@timestamp'].toString(),
      this.data._source.event.id,
    ]);
    return this.getUrlFromHits(response.hits.hits);
  }

  /**
   * Gets the alert before this one.
   */
  async getPrevUrl(): Promise<string | null> {
    const response = await this.doSearch('desc', [
      this.data._source['@timestamp'].toString(),
      this.data._source.event.id,
    ]);
    return this.getUrlFromHits(response.hits.hits);
  }
}
