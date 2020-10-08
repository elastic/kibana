/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';

import { Filter, SortFieldOrUndefined, SortOrderOrUndefined } from '../../../common/schemas';
import { Scroll } from '../lists/types';

import { calculateScrollMath } from './calculate_scroll_math';
import { getSearchAfterScroll } from './get_search_after_scroll';

interface ScrollToStartPageOptions {
  callCluster: LegacyAPICaller;
  filter: Filter;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
  page: number;
  perPage: number;
  hopSize: number;
  index: string;
  currentIndexPosition: number;
  searchAfter: string[] | undefined;
}

export const scrollToStartPage = async ({
  callCluster,
  filter,
  hopSize,
  currentIndexPosition,
  searchAfter,
  page,
  perPage,
  sortOrder,
  sortField,
  index,
}: ScrollToStartPageOptions): Promise<Scroll> => {
  const { hops, leftOverAfterHops } = calculateScrollMath({
    currentIndexPosition,
    hopSize,
    page,
    perPage,
  });

  if (hops === 0 && leftOverAfterHops === 0 && currentIndexPosition === 0) {
    // We want to use a valid searchAfter of undefined to start at the start of our list
    return {
      searchAfter: undefined,
      validSearchAfterFound: true,
    };
  } else if (hops === 0 && leftOverAfterHops === 0 && currentIndexPosition > 0) {
    return {
      searchAfter,
      validSearchAfterFound: true,
    };
  } else if (hops > 0) {
    const scroll = await getSearchAfterScroll({
      callCluster,
      filter,
      hopSize,
      hops,
      index,
      searchAfter,
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
      searchAfter,
      sortField,
      sortOrder,
    });
  }
};
