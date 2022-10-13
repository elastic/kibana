/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { IWaterfallContext } from '../context/waterfall_chart';
import { CANVAS_MAX_ITEMS } from './constants';

export interface UseBarHookProps {
  data: IWaterfallContext['data'];
}

export const useBarCharts = ({ data }: UseBarHookProps) => {
  const [charts, setCharts] = useState<Array<IWaterfallContext['data']>>([]);

  useEffect(() => {
    const chartsN: Array<IWaterfallContext['data']> = [];

    if (data?.length > 0) {
      let chartIndex = 0;
      /* We want at most CANVAS_MAX_ITEMS **RESOURCES** per array.
       * Resources !== individual timing items, but are comprised of many individual timing
       * items. The X value of each item can be used as an id for the resource.
       * We must keep track of the number of unique resources added to the each array. */
      const uniqueResources = new Set();
      let lastIndex: number;
      data.forEach((item) => {
        if (uniqueResources.size === CANVAS_MAX_ITEMS && item.x > lastIndex) {
          chartIndex++;
          uniqueResources.clear();
        }
        uniqueResources.add(item.x);
        lastIndex = item.x;
        if (!chartsN[chartIndex]) {
          chartsN.push([item]);
          return;
        }
        chartsN[chartIndex].push(item);
      });
    }

    setCharts(chartsN);
  }, [data]);

  return charts;
};
