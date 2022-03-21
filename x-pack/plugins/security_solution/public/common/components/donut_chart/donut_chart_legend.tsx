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
import { STATUS_HIGH_LABEL, STATUS_LOW_LABEL, STATUS_MEDIUM_LABEL } from './translations';

const LegendContainer = styled.div`
  max-width: 150px;
  min-width: 100px;
  @media (max-width: 767px) {
    min-width: 0px;
    max-width: 100px;
  }
`;

interface Props {
  low: number;
  high: number;
  medium: number;
}

export const DonutChartLegend = ({ low, high, medium }: Props) => {
  const {
    colors: { mean, danger, dangerBehindText },
  } = useContext(ThemeContext);
  return (
    <LegendContainer>
      <DonutChartLegendRow
        color={danger}
        content={high}
        message={STATUS_HIGH_LABEL}
        data-test-subj={'donutChart-high'}
      />
      <EuiSpacer size="m" />
      <DonutChartLegendRow
        color={dangerBehindText}
        content={medium}
        message={STATUS_MEDIUM_LABEL}
        data-test-subj={'donutChart-medium'}
      />
      <EuiSpacer size="m" />
      <DonutChartLegendRow
        color={mean}
        content={low}
        message={STATUS_LOW_LABEL}
        data-test-subj={'donutChart-low'}
      />
    </LegendContainer>
  );
};
