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
import { UptimeThemeContext } from '../../../contexts';
import { STATUS_DOWN_LABEL, STATUS_UP_LABEL } from '../translations';

const LegendContainer = styled.div`
  max-width: 150px;
  min-width: 100px;
  @media (max-width: 767px) {
    min-width: 0px;
    max-width: 100px;
  }
`;

interface Props {
  down: number;
  up: number;
}

export const DonutChartLegend = ({ down, up }: Props) => {
  const {
    colors: { gray, danger },
  } = useContext(UptimeThemeContext);
  return (
    <LegendContainer>
      <DonutChartLegendRow
        color={danger}
        content={down}
        message={STATUS_DOWN_LABEL}
        data-test-subj={'xpack.uptime.snapshot.donutChart.down'}
      />
      <EuiSpacer size="m" />
      <DonutChartLegendRow
        color={gray}
        content={up}
        message={STATUS_UP_LABEL}
        data-test-subj={'xpack.uptime.snapshot.donutChart.up'}
      />
    </LegendContainer>
  );
};
