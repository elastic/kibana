/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PartialTheme } from '@elastic/charts';
import { useMemo } from 'react';
import { useEuiTheme } from '../../../../../../../../src/plugins/kibana_react/common';
export const useDataVizChartTheme = (): PartialTheme => {
  const { eui } = useEuiTheme();
  const chartTheme = useMemo(() => {
    const AREA_SERIES_COLOR = eui.euiColorVis0;
    return {
      axes: {
        tickLabel: {
          fontSize: parseInt(eui.euiFontSizeXS, 10),
          fontFamily: eui.euiFontFamily,
          fontStyle: 'italic',
        },
      },
      background: { color: 'transparent' },
      chartMargins: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
      chartPaddings: {
        left: 0,
        right: 0,
        top: 4,
        bottom: 0,
      },
      scales: { barsPadding: 0.1 },
      colors: {
        vizColors: [AREA_SERIES_COLOR],
      },
      areaSeriesStyle: {
        line: {
          strokeWidth: 1,
          visible: true,
        },
        point: {
          visible: false,
          radius: 0,
          opacity: 0,
        },
        area: { visible: true, opacity: 1 },
      },
    };
  }, [eui]);
  return chartTheme;
};
