/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GetResponse, SearchResponse } from 'elasticsearch';
import { RequestHandlerContext } from 'src/core/server';
import { AlertData, AlertHits, Direction } from '../../../../../common/types';
import { EndpointConfigType } from '../../../../config';
import { searchESForAlerts, Pagination } from '../../lib';
import { AlertSearchQuery, SearchCursor, AlertDetailsRequestParams } from '../../types';
import { BASE_ALERTS_ROUTE } from '../..';

/**
 * Pagination class for alert details.
 */
export class AlertDetailsPagination extends Pagination<
  AlertDetailsRequestParams,
  GetResponse<AlertData>
> {
  constructor(
    config: EndpointConfigType,
    requestContext: RequestHandlerContext,
    state: AlertDetailsRequestParams,
    data: GetResponse<AlertData>
  ) {
    super(config, requestContext, state, data);
  }

  protected async doSearch(
    direction: Direction,
    cursor: SearchCursor
  ): Promise<SearchResponse<AlertData>> {
    const reqData: AlertSearchQuery = {
      pageSize: 1,
      sort: this.config.alertResultListDefaultSort,
      order: this.config.alertResultListDefaultOrder as Direction,
    };

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
      return `${BASE_ALERTS_ROUTE}/${hits[0]._id}`;
    }
    return null;
  }

  async getNextUrl(): Promise<string | null> {
    const response = await this.doSearch(Direction.asc, [
      this.data._source['@timestamp'].toString(),
      this.data._source.event.id,
    ]);
    return this.getUrlFromHits(response.hits.hits);
  }

  async getPrevUrl(): Promise<string | null> {
    const response = await this.doSearch(Direction.desc, [
      this.data._source['@timestamp'].toString(),
      this.data._source.event.id,
    ]);
    return this.getUrlFromHits(response.hits.hits);
  }
}
