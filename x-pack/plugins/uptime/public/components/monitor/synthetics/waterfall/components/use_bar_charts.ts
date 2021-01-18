/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
      let chartIndex = 1;

      const firstCanvasItems = data.filter((item) => item.x <= CANVAS_MAX_ITEMS);

      const chartsN: Array<IWaterfallContext['data']> = [firstCanvasItems];

      data.forEach((item) => {
        // Subtract 1 to account for x value starting from 0
        if (item.x === CANVAS_MAX_ITEMS * chartIndex && !chartsN[item.x / CANVAS_MAX_ITEMS]) {
          chartsN.push([]);
          chartIndex++;
        }
        chartsN[chartIndex - 1].push(item);
      });

      setCharts(chartsN);
    }
  }, [data]);

  return charts;
};
