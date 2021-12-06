/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Axis, BarSeries, Chart, Settings } from '@elastic/charts';
import { euiPaletteForStatus } from '@elastic/eui';
import { useCloudPostureStatsApi } from '../../../common/api/use_cloud_posture_stats_api';
import { useNavigateToCSPFindings } from '../../../common/hooks/use_navigate_to_csp_findings';

export function sortAscending<T>(getter: (x: T) => number | string) {
  return (a: T, b: T) => {
    const v1 = getter(a);
    const v2 = getter(b);
    if (v1 > v2) return -1;
    if (v2 > v1) return 1;

    return 0;
  };
}

export const ResourcesAtRiskChart = () => {
  const { navigate } = useNavigateToCSPFindings();
  const getStats = useCloudPostureStatsApi();
  const resources = getStats.isSuccess && getStats.data.resourcesEvaluations;
  if (!resources) return null;

  // TODO: add type
  // @ts-ignore
  const handleElementClick = (e) => {
    const [data] = e;
    const [groupsData] = data;

    navigate(
      `(language:kuery,query:'resource.filename : "${
        groupsData.datum.name
      }" and result.evaluation : ${groupsData.datum.evaluation.toLowerCase()}')`
    );
  };

  const top5 = resources.length > 5 ? resources.slice(0, 5) : resources;

  return (
    <Chart size={{ height: 200 }}>
      <Settings
        theme={theme}
        rotation={90}
        showLegend={false}
        onElementClick={handleElementClick}
      />
      <Axis id="left" position="left" />
      <BarSeries
        displayValueSettings={{
          showValueLabel: true,
        }}
        id="resources-at-risk-bars"
        data={top5}
        xAccessor={'resource'}
        yAccessors={['value']}
        splitSeriesAccessors={['evaluation']}
        stackAccessors={['evaluation']}
      />
    </Chart>
  );
};

const theme = {
  colors: { vizColors: euiPaletteForStatus(2) },
  barSeriesStyle: {
    displayValue: {
      fontSize: 14,
      fontFamily: "'Open Sans', Helvetica, Arial, sans-serif",
      fill: { color: 'white', borderColor: 'blue', borderWidth: 0 },
      offsetX: 5,
      offsetY: -5,
    },
  },
};
