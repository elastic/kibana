/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { XYBrushArea } from '@elastic/charts';
import { History } from 'history';
import { fromQuery, toQuery } from '../../../utils/url';

export const onBrushEnd = ({ x, history }: { x: XYBrushArea['x']; history: History }) => {
  if (x) {
    const start = x[0];
    const end = x[1];

    const currentSearch = toQuery(history.location.search);
    const nextSearch = {
      rangeFrom: new Date(start).toISOString(),
      rangeTo: new Date(end).toISOString(),
    };
    history.push({
      ...history.location,
      search: fromQuery({
        ...currentSearch,
        ...nextSearch,
      }),
    });
  }
};
