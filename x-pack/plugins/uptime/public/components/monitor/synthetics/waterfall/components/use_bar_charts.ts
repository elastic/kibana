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

export const useBarCharts = ({ data = [] }: UseBarHookProps) => {
  const [charts, setCharts] = useState<Array<IWaterfallContext['data']>>([]);

  useEffect(() => {
    if (data.length > 0) {
      let chartIndex = 0;

      const chartsN: Array<IWaterfallContext['data']> = [];

      data.forEach((item) => {
        // Subtract 1 to account for x value starting from 0
        if (item.x === CANVAS_MAX_ITEMS * chartIndex && !chartsN[item.x / CANVAS_MAX_ITEMS]) {
          chartsN.push([item]);
          chartIndex++;
          return;
        }
        chartsN[chartIndex - 1].push(item);
      });

      setCharts(chartsN);
    }
  }, [data]);

  return charts;
};
