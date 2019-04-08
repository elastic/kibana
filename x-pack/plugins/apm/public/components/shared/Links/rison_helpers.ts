/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import rison from 'rison-node';
import { StringMap } from '../../../../typings/common';
import { TIMEPICKER_DEFAULTS } from '../../../store/urlParams';
import { toQuery } from './url_helpers';

export interface TimepickerRisonData {
  time?: {
    from?: string;
    to?: string;
  };
  refreshInterval?: {
    pause?: boolean | string;
    value?: number | string;
  };
}

interface RisonQuery {
  _g?: TimepickerRisonData & StringMap<any>;
  _a?: StringMap<any>;
}

export function getTimepickerRisonData(currentSearch: Location['search']) {
  const currentQuery = toQuery(currentSearch);
  const nextQuery = {
    ...TIMEPICKER_DEFAULTS,
    ...currentQuery
  };
  return {
    time: {
      from: encodeURIComponent(nextQuery.rangeFrom),
      to: encodeURIComponent(nextQuery.rangeTo)
    },
    refreshInterval: {
      pause: String(nextQuery.refreshPaused),
      value: String(nextQuery.refreshInterval)
    }
  };
}

export function risonStringify(query: RisonQuery) {
  const encodedG = query._g ? rison.encode(query._g) : '';
  const encodedA = query._a ? rison.encode(query._a) : '';
  const risonValues = [];

  if (encodedG) {
    risonValues.push(`_g=${encodedG}`);
  }

  if (encodedA) {
    risonValues.push(`_a=${encodedA}`);
  }

  return risonValues.join('&');
}
