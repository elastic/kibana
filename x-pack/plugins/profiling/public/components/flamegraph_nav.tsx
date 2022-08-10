/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEuiTheme } from '@elastic/eui';
import React, { useEffect } from 'react';
import { ElasticFlameGraph } from '../../common/flamegraph';
import { TimeRange } from '../../common/types';

interface Props {
  timeRange: TimeRange;
  kuery: string;
  comparisonTimeRange: Partial<TimeRange>;
  comparisonKuery: string;
  getter: (params: {
    timeFrom: number;
    timeTo: number;
    kuery: string;
  }) => Promise<ElasticFlameGraph>;
  setter: React.Dispatch<{
    primaryFlamegraph: ElasticFlameGraph;
    comparisonFlamegraph?: ElasticFlameGraph;
  }>;
}

export const FlameGraphNavigation = ({
  timeRange,
  getter,
  setter,
  kuery,
  comparisonKuery,
  comparisonTimeRange,
}: Props) => {
  const theme = useEuiTheme();

  useEffect(() => {
    Promise.all([
      getter({
        timeFrom: new Date(timeRange.start).getTime() / 1000,
        timeTo: new Date(timeRange.end).getTime() / 1000,
        kuery,
      }),
      comparisonTimeRange.start && comparisonTimeRange.end
        ? getter({
            timeFrom: new Date(comparisonTimeRange.start).getTime() / 1000,
            timeTo: new Date(comparisonTimeRange.end).getTime() / 1000,
            kuery: comparisonKuery,
          })
        : Promise.resolve(undefined),
    ]).then(([primaryFlamegraph, comparisonFlamegraph]) => {
      setter({ primaryFlamegraph, comparisonFlamegraph });
    });
  }, [
    timeRange.start,
    timeRange.end,
    getter,
    setter,
    kuery,
    comparisonKuery,
    comparisonTimeRange?.start,
    comparisonTimeRange?.end,
    theme.euiTheme.colors.danger,
    theme.euiTheme.colors.success,
    theme.euiTheme.colors.lightShade,
  ]);

  return <></>;
};
