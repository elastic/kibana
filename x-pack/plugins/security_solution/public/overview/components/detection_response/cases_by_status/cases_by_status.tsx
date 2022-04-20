/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { Rotation, ScaleType } from '@elastic/charts';
import styled from 'styled-components';
import { getHistogramConfig } from '../../../../detections/components/rules/rule_preview/helpers';
import { BarChart } from '../../../../common/components/charts/barchart';
import { ChartSeriesConfigs } from '../../../../common/components/charts/common';
import { LastUpdatedAt } from '../util';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { HeaderSection } from '../../../../common/components/header_section';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { CASES_BY_STATUS_SECTION_TITLE, VIEW_CASES } from '../translations';
import { LinkButton } from '../../../../common/components/links';
import { useCasesByStatus } from './use_cases_by_status';

const CASES_BY_STATUS_ID = 'casesByStatus';

interface CasesByStatusProps {}

export const numberFormatter = (value: string | number): string => value.toLocaleString();

export const barchartConfigs = () => ({
  series: {
    xScaleType: ScaleType.Ordinal,
    yScaleType: ScaleType.Linear,
    stackAccessors: ['y0'],
  },
  axis: {
    xTickFormatter: numberFormatter,
  },
  settings: {
    rotation: 90 as Rotation,
  },
  customHeight: 110,
});

const Wrapper = styled.div`
  width: 342px;
`;

export const CasesByStatus: React.FC<CasesByStatusProps> = () => {
  const { toggleStatus, setToggleStatus } = useQueryToggle(CASES_BY_STATUS_ID);
  const { to, from } = useGlobalTime();

  const barConfig = useMemo((): ChartSeriesConfigs => barchartConfigs(), []);
  const { closed, inProgress, isLoading, open, totalCounts, updatedAt } = useCasesByStatus();

  const chartData = useMemo(
    () => [
      { key: 'open', value: [{ y: open, x: 'open' }], color: '#D36086' },
      {
        key: 'inprogress',
        value: [{ y: inProgress, x: 'inprogress' }],
        color: '#9170B8',
      },
      {
        key: 'closed',
        value: [{ y: closed, x: 'closed' }],
        color: '#9170B8',
      },
    ],
    [closed, inProgress, open]
  );

  return (
    <EuiPanel hasBorder>
      <HeaderSection
        id={CASES_BY_STATUS_ID}
        title={CASES_BY_STATUS_SECTION_TITLE}
        titleSize="s"
        toggleStatus={toggleStatus}
        toggleQuery={setToggleStatus}
        subtitle={<LastUpdatedAt updatedAt={updatedAt} isUpdating={isLoading} />}
      >
        <LinkButton href="#">{VIEW_CASES}</LinkButton>
      </HeaderSection>
      {!isLoading && toggleStatus && (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <Wrapper>
              <BarChart configs={barConfig} barChart={chartData} />
            </Wrapper>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};
