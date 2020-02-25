/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Request params for alert details.
 */
import { GetResponse, SearchResponse } from 'elasticsearch';
import { RequestHandlerContext } from 'src/core/server';
import { AlertData, AlertHits, Direction, Maybe } from '../../../../common/types';
import { EndpointConfigType } from '../../../config';
import { searchESForAlerts } from '../lib';
import { AlertSearchQuery, Pagination, SearchCursor } from '../types';
import { BASE_ALERTS_ROUTE } from '..';

export interface AlertDetailsRequestParams {
  id: string;
}

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

  protected getUrlFromHits(hits: AlertHits): Maybe<string> {
    if (hits.length > 0) {
      return `${BASE_ALERTS_ROUTE}/${hits[0]._id}`;
    }
  }

  async getNextUrl(): Promise<Maybe<string>> {
    const response = await this.doSearch(Direction.asc, [
      this.data._source['@timestamp'].toString(),
      this.data._source.event.id,
    ]);
    return this.getUrlFromHits(response.hits.hits);
  }

  async getPrevUrl(): Promise<Maybe<string>> {
    const response = await this.doSearch(Direction.desc, [
      this.data._source['@timestamp'].toString(),
      this.data._source.event.id,
    ]);
    return this.getUrlFromHits(response.hits.hits);
  }
}
