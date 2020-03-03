/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GetResponse, SearchResponse } from 'elasticsearch';
import { RequestHandlerContext } from 'src/core/server';
import { AlertEvent, AlertHits, Direction } from '../../../../../common/types';
import { Pagination, buildQueryString, searchESForAlerts } from '../../lib';
import { AlertSearchParams, SearchCursor } from '../../types';
import { BASE_ALERTS_ROUTE } from '../..';

/**
 * Pagination class for alert details.
 */
export class AlertDetailsPagination extends Pagination<AlertSearchParams, GetResponse<AlertEvent>> {
  constructor(
    requestContext: RequestHandlerContext,
    state: AlertSearchParams,
    data: GetResponse<AlertEvent>
  ) {
    super(requestContext, state, data);
  }

  protected async doSearch(
    direction: Direction,
    cursor: SearchCursor
  ): Promise<SearchResponse<AlertEvent>> {
    const reqData = this.state;
    if (direction === Direction.asc) {
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
      return `${BASE_ALERTS_ROUTE}/${hits[0]._id}?${buildQueryString(
        (({ dateRange, filters, query, sort, order }) => ({
          pageSize: 1,
          dateRange,
          filters,
          query,
          sort,
          order,
        }))(this.state)
      )}`;
    }
    return null;
  }

  /**
   * Gets the next alert after this one.
   */
  async getNextUrl(): Promise<string | null> {
    const response = await this.doSearch(Direction.asc, [
      this.data._source['@timestamp'].toString(),
      this.data._source.event.id,
    ]);
    return this.getUrlFromHits(response.hits.hits);
  }

  /**
   * Gets the alert before this one.
   */
  async getPrevUrl(): Promise<string | null> {
    const response = await this.doSearch(Direction.desc, [
      this.data._source['@timestamp'].toString(),
      this.data._source.event.id,
    ]);
    return this.getUrlFromHits(response.hits.hits);
  }
}
