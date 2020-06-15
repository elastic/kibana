/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { RisonValue, encode } from 'rison-node';
import { RequestHandlerContext } from 'src/core/server';
import { AlertHits, AlertSearchQuery } from '../../../../../../common/endpoint_alerts/types';
import { EndpointConfigType } from '../../../../config';
import { Pagination } from '../../lib/pagination';
import { BASE_ALERTS_ROUTE } from '../../../routes';

/**
 * Pagination class for alert list.
 */
export class AlertListPagination extends Pagination<AlertSearchQuery, AlertHits> {
  protected hitLen: number;

  constructor(
    config: EndpointConfigType,
    requestContext: RequestHandlerContext,
    state: AlertSearchQuery,
    data: AlertHits
  ) {
    super(config, requestContext, state, data);
    this.hitLen = data.length;
  }

  protected getBasePaginationParams(): string {
    let pageParams: string = '';
    if (this.state.query) {
      pageParams += `query=${encode((this.state.query as unknown) as RisonValue)}&`;
    }

    if (this.state.filters !== undefined && this.state.filters.length > 0) {
      pageParams += `filters=${encode((this.state.filters as unknown) as RisonValue)}&`;
    }

    pageParams += `date_range=${encode((this.state.dateRange as unknown) as RisonValue)}&`;

    if (this.state.sort !== undefined) {
      pageParams += `sort=${this.state.sort}&`;
    }

    if (this.state.order !== undefined) {
      pageParams += `order=${this.state.order}&`;
    }

    pageParams += `page_size=${this.state.pageSize}&`;

    // NOTE: `search_after` and `search_before` are appended later.
    return pageParams.slice(0, -1); // strip trailing `&`
  }

  /**
   * Gets the next set of alerts after this one.
   */
  async getNextUrl(): Promise<string | null> {
    let url = null;
    if (this.hitLen > 0 && this.hitLen <= this.state.pageSize) {
      const lastCustomSortValue: string = get(
        this.data[this.hitLen - 1]._source,
        this.state.sort
      ) as string;
      const lastEventId: string = this.data[this.hitLen - 1]._source.event.id;
      url = `${BASE_ALERTS_ROUTE}?${this.getBasePaginationParams()}&after=${lastCustomSortValue}&after=${lastEventId}`;
    }
    return url;
  }

  /**
   * Gets the previous set of alerts before this one.
   */
  async getPrevUrl(): Promise<string | null> {
    let url = null;
    if (this.hitLen > 0) {
      const firstCustomSortValue: string = get(this.data[0]._source, this.state.sort) as string;
      const firstEventId: string = this.data[0]._source.event.id;
      url = `${BASE_ALERTS_ROUTE}?${this.getBasePaginationParams()}&before=${firstCustomSortValue}&before=${firstEventId}`;
    }
    return url;
  }
}
