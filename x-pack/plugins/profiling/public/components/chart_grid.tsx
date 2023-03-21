/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGrid, EuiFlexItem, EuiFlyout, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { take } from 'lodash';
import React, { useState } from 'react';
import { TopNSubchart } from '../../common/topn';
import { SubChart } from './subchart';

export interface ChartGridProps {
  limit: number;
  charts: TopNSubchart[];
  showFrames: boolean;
}

export const ChartGrid: React.FC<ChartGridProps> = ({ limit, charts, showFrames }) => {
  const maximum = Math.min(limit, charts.length ?? 0);

  const ncharts = Math.min(maximum, charts.length);

  const [selectedSubchart, setSelectedSubchart] = useState<TopNSubchart | undefined>(undefined);

  return (
    <>
      <EuiSpacer />
      <EuiTitle size="s">
        <h1>Top {charts.length}</h1>
      </EuiTitle>
      <EuiSpacer />
      <EuiFlexGrid columns={2} gutterSize="m">
        {take(charts, ncharts).map((subchart, i) => (
          <EuiFlexItem key={i}>
            <EuiPanel paddingSize="none">
              <SubChart
                index={subchart.Index}
                color={subchart.Color}
                category={subchart.Category}
                label={subchart.Label}
                percentage={subchart.Percentage}
                metadata={subchart.Metadata}
                height={200}
                data={subchart.Series}
                sample={null}
                showAxes
                onShowMoreClick={() => {
                  setSelectedSubchart(subchart);
                }}
                showFrames={showFrames}
                padTitle
              />
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
      {selectedSubchart && (
        <EuiFlyout
          onClose={() => {
            setSelectedSubchart(undefined);
          }}
        >
          <SubChart
            style={{ overflow: 'auto' }}
            index={selectedSubchart.Index}
            color={selectedSubchart.Color}
            category={selectedSubchart.Category}
            label={selectedSubchart.Label}
            percentage={selectedSubchart.Percentage}
            metadata={selectedSubchart.Metadata}
            height={200}
            data={selectedSubchart.Series}
            sample={null}
            showAxes
            onShowMoreClick={null}
            showFrames={showFrames}
            padTitle
          />
        </EuiFlyout>
      )}
    </>
  );
};
