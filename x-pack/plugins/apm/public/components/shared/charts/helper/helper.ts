/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { XYBrushArea } from '@elastic/charts';
import { History } from 'history';
import { TimeSeries } from '../../../../../typings/timeseries';
import { fromQuery, toQuery } from '../../Links/url_helpers';

export const onBrushEnd = ({
  x,
  history,
}: {
  x: XYBrushArea['x'];
  history: History;
}) => {
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

export function isTimeseriesEmpty(timeseries?: TimeSeries[]) {
  return (
    !timeseries ||
    timeseries
      .map((serie) => serie.data)
      .flat()
      .every(
        ({ y }: { x?: number | null; y?: number | null }) =>
          y === null || y === undefined
      )
  );
}
