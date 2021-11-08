/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */
/* eslint-disable react/button-has-type */
/* eslint-disable react/jsx-no-literals */

import React from 'react';
import {
  EuiTextColor,
  EuiErrorBoundary,
  EuiListGroup,
  EuiFlexGroup,
  EuiText,
  EuiFlexItem,
  EuiStat,
  EuiPanel,
  EuiCard,
  EuiSpacer,
  PropsOf,
} from '@elastic/eui';
import { EUI_CHARTS_THEME_DARK, EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { Partition, ScaleType, Chart, Settings, BarSeries } from '@elastic/charts';
import styled from 'styled-components';
import { useQuery } from 'react-query';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { HeaderPage } from '../../../common/components/header_page';
import { useKibana } from '../../../common/lib/kibana';
import { ChartList } from './chart_list';

const useCloudPostureScore = () => {
  const { http } = useKibana().services;
  return useQuery(['csp_findings'], () => http.get('/api/csp/findings'));
};

export const CloudPostureScoreChart = () => {
  const foo = useCloudPostureScore();
  console.log({ foo });
  return <h1>status: {foo.status}</h1>;
  // return <Pie2 data={foo.data} />;
};

export const CloudPostureScoreChart2 = () => {
  const euiChartTheme = EUI_CHARTS_THEME_LIGHT;
  const euiPartitionConfig = euiChartTheme.partition;
  const colors = { failed: '#E7664C', passed: '#54B399' };
  return (
    <Chart>
      <Partition
        id="aaa"
        data={[
          { category: 'Passed', percent: 78 },
          { category: 'Failed', percent: 22 },
        ]}
        valueAccessor={(d) => Number(d.percent)}
        valueFormatter={() => ''}
        layers={[
          {
            groupByRollup: (d) => d.category,
            fillLabel: {
              valueFormatter: (v) => '',
            },
            shape: {
              fillColor: (d) => colors[d.dataName.toLowerCase()],
            },
          },
        ]}
        config={{
          ...euiPartitionConfig,
          emptySizeRatio: 0.5,
        }}
      />
    </Chart>
  );
};

const Pie2 = ({ data }: any) => {
  const radius = 50;
  const circ = 2 * Math.PI * radius;

  return (
    <svg width="100%" viewBox="0 0 623 150">
      {data.map((slice, i) => {
        const percentage = slice.value / 100;
        return (
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            key={i}
            fill="none"
            strokeWidth="10"
            stroke={slice.color}
            strokeDasharray={circ}
            // strokeDasharray={`${circ * percentage} ${circ}`}
            // strokeDashoffset={circ - (circ * slice.value) / 100}
            // strokeDasharray={`${circ * (slice.value / 100)} ${circ}`}
            strokeDashoffset={circ - circ * percentage}
          />
        );
      })}
    </svg>
  );
};
const PieChart = ({ data }: any) => {
  const ref = React.useRef<SVGCircleElement>();
  const cref = React.useRef<SVGCircleElement>();
  const [length, setLength] = React.useState(0);
  const [size, setSize] = React.useState();
  React.useEffect(() => {
    if (!ref.current || !cref.current) return;
    const length = ref.current.getTotalLength();
    setLength(length);

    setSize(cref.current.getBoundingClientRect());
  }, []);

  const foo = data.map((slice) => ({
    ...slice,
    v: (slice.value / 100) * length,
  }));
  return (
    <div ref={cref}>
      <svg
        width={size?.width}
        height={size?.height}
        viewBox={`0 0 ${size?.width || 0} ${size?.height || 0}`}
      >
        <circle cx="50%" cy="50%" r="15%" ref={ref} fill="transparent" />
        {!!length &&
          foo.map((slice, i) => {
            return (
              <circle
                cx="50%"
                cy="50%"
                r="15%"
                fill="none"
                strokeWidth="15"
                stroke={slice.color}
                strokeDasharray={`${slice.v} ${length - slice.v}`}
                strokeDashoffset={foo.slice(0, i).reduce((a, c) => {
                  return a + slice.v;
                }, 0)}
              />
            );
          })}
        {/* <text dy=".3em" x="50%" y="50%" textAnchor="middle" fontSize="30" fontWeight="bold">
        {Math.max(...foo.map((v) => v.value)) + '%'}
      </text> */}
      </svg>
    </div>
  );
};
