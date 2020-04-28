/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GetResponse, SearchResponse } from 'elasticsearch';
import { AlertEvent, AlertHits, AlertAPIOrdering } from '../../../../../common/types';
import { AlertConstants } from '../../../../../common/alert_constants';
import { EndpointConfigType } from '../../../../config';
import { searchESForAlerts, Pagination } from '../../lib';
import { AlertSearchQuery, SearchCursor, AlertDetailsRequestParams } from '../../types';
import { BASE_ALERTS_ROUTE } from '../..';
import { RequestHandlerContext } from '../../../../../../../../src/core/server';
import { Filter } from '../../../../../../../../src/plugins/data/server';

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
    data: GetResponse<AlertEvent>,
    private readonly indexPattern: string
  ) {
    super(config, requestContext, state, data);
  }

  protected async doSearch(
    direction: AlertAPIOrdering,
    cursor: SearchCursor
  ): Promise<SearchResponse<AlertEvent>> {
    const reqData: AlertSearchQuery = {
      pageSize: 1,
      sort: AlertConstants.ALERT_LIST_DEFAULT_SORT,
      order: 'desc',
      query: { query: '', language: 'kuery' },
      filters: [] as Filter[],
    };

    if (direction === 'asc') {
      reqData.searchAfter = cursor;
    } else {
      reqData.searchBefore = cursor;
    }

    const response = await searchESForAlerts(
      this.requestContext.core.elasticsearch.dataClient,
      reqData,
      this.indexPattern
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
