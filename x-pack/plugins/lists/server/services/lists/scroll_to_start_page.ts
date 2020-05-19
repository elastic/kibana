/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'kibana/server';

import {
  FilterOrUndefined,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
} from '../../../common/schemas';

import { calculateScrollMath } from './calculate_scroll_math';
import { getSearchAfterScroll } from './get_search_after_scroll';

interface ScrollToStartPageOptions {
  callCluster: APICaller;
  filter: FilterOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
  page: number;
  perPage: number;
  hopSize: number;
  index: string;
}

export const scrollToStartPage = async ({
  callCluster,
  filter,
  hopSize,
  page,
  perPage,
  sortOrder,
  sortField,
  index,
}: ScrollToStartPageOptions): Promise<Scroll> => {
  const { hops, leftOverAfterHops } = calculateScrollMath({
    hopSize,
    page,
    perPage,
  });

  if (hops === 0 && leftOverAfterHops === 0) {
    // We want to use a valid searchAfter of undefined to start at the start of our list
    return {
      searchAfter: undefined,
      validSearchAfterFound: true,
    };
  }
  if (hops > 0) {
    const scroll = await getSearchAfterScroll({
      callCluster,
      filter,
      hopSize,
      hops,
      index,
      searchAfter: undefined,
      sortField,
      sortOrder,
    });
    if (scroll.validSearchAfterFound && leftOverAfterHops > 0) {
      return getSearchAfterScroll({
        callCluster,
        filter,
        hopSize: leftOverAfterHops,
        hops: 1,
        index,
        searchAfter: scroll.searchAfter,
        sortField,
        sortOrder,
      });
    } else {
      return scroll;
    }
  } else {
    return getSearchAfterScroll({
      callCluster,
      filter,
      hopSize: leftOverAfterHops,
      hops: 1,
      index,
      searchAfter: undefined,
      sortField,
      sortOrder,
    });
  }
};
