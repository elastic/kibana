/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer, EuiLoadingChart } from '@elastic/eui';
import styled from 'styled-components';

import { BarChart } from '../../../../common/components/charts/barchart';
import { Panel } from '../../../../common/components/panel';
import { HeaderSection } from '../../../../common/components/header_section';
import { ChartSeriesData, ChartSeriesConfigs } from '../../../../common/components/charts/common';

const LoadingChart = styled(EuiLoadingChart)`
  display: block;
  margin: 0 auto;
`;

interface PreviewHistogramProps {
  id: string;
  data: ChartSeriesData[];
  barConfig: ChartSeriesConfigs;
  title: string;
  subtitle: string;
  disclaimer: string;
  isLoading: boolean;
}

export const PreviewHistogram = ({
  id,
  data,
  barConfig,
  title,
  subtitle,
  disclaimer,
  isLoading,
}: PreviewHistogramProps) => {
  return (
    <>
      <Panel height={300}>
        <EuiFlexGroup gutterSize="none" direction="column">
          <EuiFlexItem grow={1}>
            <HeaderSection id={id} title={title} titleSize="xs" subtitle={subtitle} />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            {isLoading ? (
              <LoadingChart size="l" data-test-subj="queryPreviewLoading" />
            ) : (
              <BarChart
                configs={barConfig}
                barChart={data}
                stackByField={undefined}
                timelineId={undefined}
                data-test-subj="sharedPreviewQueryHistogram"
              />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <>
              <EuiSpacer />
              <EuiText size="s" color="subdued">
                <p>{disclaimer}</p>
              </EuiText>
            </>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Panel>
    </>
  );
};
