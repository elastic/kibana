/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { RisonValue, encode } from 'rison-node';
import { RequestHandlerContext } from 'src/core/server';
import { AlertHitsWrapper } from '../../../../../common/types';
import { EndpointConfigType } from '../../../../config';
import { AlertSearchQuery } from '../../types';
import { Pagination } from '../../lib';
import { BASE_ALERTS_ROUTE } from '../..';

/**
 * Pagination class for alert list.
 */
export class AlertListPagination extends Pagination<AlertSearchQuery, AlertHitsWrapper> {
  protected hitLen: number;

  constructor(
    config: EndpointConfigType,
    requestContext: RequestHandlerContext,
    state: AlertSearchQuery,
    data: AlertHitsWrapper
  ) {
    super(config, requestContext, state, data);
    this.hitLen = data.hits.length;
  }

  protected isUsingSimplePagination(): boolean {
    return this.state.pageIndex !== undefined;
  }

  protected getBasePaginationParams(): string {
    let pageParams: string = `page_size=${this.state.pageSize}&`;

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
    return pageParams.slice(0, -1); // strip trailing `&`
  }

  protected getNextUrlSimple(): string | null {
    let url = null;
    // const total: ESTotal = (this.data.total as unknown) as ESTotal;

    if (this.state.fromIndex + this.state.pageSize < this.data.total.value) {
      url = `${BASE_ALERTS_ROUTE}?page_index=${this.state.pageIndex +
        1}&${this.getBasePaginationParams()}`;
    }
    return url;
  }

  protected getNextUrlAdvanced(): string | null {
    let url = null;
    if (this.hitLen > 0 && this.hitLen <= this.state.pageSize) {
      const lastCustomSortValue: string = get(
        this.data.hits[this.hitLen - 1]._source,
        this.state.sort
      ) as string;
      const lastEventId: string = this.data.hits[this.hitLen - 1]._source.event.id;
      url = `${BASE_ALERTS_ROUTE}?${this.getBasePaginationParams()}&after=${lastCustomSortValue}&after=${lastEventId}`;
    }
    return url;
  }

  /**
   * Gets the next set of alerts after this one.
   */
  async getNextUrl(): Promise<string | null> {
    if (this.isUsingSimplePagination()) {
      return this.getNextUrlSimple();
    }
    return this.getNextUrlAdvanced();
  }

  protected getPrevUrlSimple(): string | null {
    let url = null;
    if (this.state.pageIndex > 0) {
      url = `${BASE_ALERTS_ROUTE}?page_index=${this.state.pageIndex -
        1}&${this.getBasePaginationParams()}`;
    }
    return url;
  }

  protected getPrevUrlAdvanced(): string | null {
    let url = null;
    if (this.hitLen > 0) {
      const firstCustomSortValue: string = get(
        this.data.hits[0]._source,
        this.state.sort
      ) as string;
      const firstEventId: string = this.data.hits[0]._source.event.id;
      url = `${BASE_ALERTS_ROUTE}?${this.getBasePaginationParams()}&before=${firstCustomSortValue}&before=${firstEventId}`;
    }
    return url;
  }

  /**
   * Gets the next set of alerts after this one.
   */
  async getPrevUrl(): Promise<string | null> {
    if (this.isUsingSimplePagination()) {
      return this.getPrevUrlSimple();
    }
    return this.getPrevUrlAdvanced();
  }
}
