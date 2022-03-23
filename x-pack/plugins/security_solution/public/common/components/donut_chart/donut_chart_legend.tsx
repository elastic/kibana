/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useContext } from 'react';
import styled from 'styled-components';
import { DonutChartLegendRow } from './donut_chart_legend_row';
import { ThemeContext } from './theme_context';
import { DonutChartData } from './types';

const LegendContainer = styled.div`
  max-width: 150px;
  min-width: 100px;
  @media (max-width: 767px) {
    min-width: 0px;
    max-width: 100px;
  }
`;

interface DonutChartLegendProps {
  data: DonutChartData[];
}

export const DonutChartLegend = ({ data }: DonutChartLegendProps) => {
  const {
    colors: { mean, danger, dangerBehindText },
  } = useContext(ThemeContext);
  const colors = [danger, dangerBehindText, mean];
  return (
    <LegendContainer>
      {data.map((d, idx) => (
        <>
          {idx !== 0 && <EuiSpacer size="m" />}
          <DonutChartLegendRow
            key={`donutChart-${d.name}-legend`}
            color={colors[idx]}
            content={d.value}
            message={d.label}
            data-test-subj={`donutChart-${d.name}-legend`}
          />
        </>
      ))}
    </LegendContainer>
  );
};
