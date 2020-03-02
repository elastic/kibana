/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { RequestHandlerContext } from 'src/core/server';
import { AlertHits } from '../../../../../common/types';
import { EndpointConfigType } from '../../../../config';
import { AlertSearchParams } from '../../types';
import { Pagination, buildQueryString } from '../../lib';
import { BASE_ALERTS_ROUTE } from '../..';

/**
 * Pagination class for alert list.
 */
export class AlertListPagination extends Pagination<AlertSearchParams, AlertHits> {
  protected hitLen: number;

  constructor(
    config: EndpointConfigType,
    requestContext: RequestHandlerContext,
    state: AlertSearchParams,
    data: AlertHits
  ) {
    super(config, requestContext, state, data);
    this.hitLen = data.length;
  }

  /**
   * Gets the next set of alerts after this one.
   */
  async getNextUrl(): Promise<string | null> {
    const state = this.state;
    if (this.hitLen > 0 && this.hitLen <= this.state.pageSize) {
      const lastCustomSortValue: string = get(
        this.data[this.hitLen - 1]._source,
        this.state.sort
      ) as string;
      const lastEventId: string = this.data[this.hitLen - 1]._source.event.id;

      delete state.pageIndex;
      delete state.searchBefore;
      state.searchAfter = [lastCustomSortValue, lastEventId];
    }
    return `${BASE_ALERTS_ROUTE}?${buildQueryString(state)}`;
  }

  /**
   * Gets the previous set of alerts before this one.
   */
  async getPrevUrl(): Promise<string | null> {
    const state = this.state;
    if (this.hitLen > 0) {
      const firstCustomSortValue: string = get(this.data[0]._source, this.state.sort) as string;
      const firstEventId: string = this.data[0]._source.event.id;

      delete state.pageIndex;
      delete state.searchAfter;
      state.searchBefore = [firstCustomSortValue, firstEventId];
    }
    return `${BASE_ALERTS_ROUTE}?${buildQueryString(state)}`;
  }
}
