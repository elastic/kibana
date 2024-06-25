/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPanel, EuiHorizontalRule } from '@elastic/eui';
import React, { useMemo } from 'react';

import { StatItemHeader } from './stat_item_header';
import { useToggleStatus } from './use_toggle_status';
import type { StatItemsProps } from './types';
import { FlexItem, ChartHeight } from './utils';
import { MetricEmbeddable } from './metric_embeddable';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';

export const StatItemsComponent = React.memo<StatItemsProps>(({ statItems, from, id, to }) => {
  const timerange = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to]
  );
  const {
    key,
    description,
    enableAreaChart,
    enableBarChart,
    fields,
    barChartLensAttributes,
    areaChartLensAttributes,
  } = statItems;

  const { isToggleExpanded, onToggle } = useToggleStatus({ id });

  return (
    <FlexItem grow={1} data-test-subj={key}>
      <EuiPanel hasBorder>
        <StatItemHeader
          onToggle={onToggle}
          isToggleExpanded={isToggleExpanded}
          description={description}
        />

        {isToggleExpanded && (
          <>
            <MetricEmbeddable
              fields={fields}
              id={id}
              timerange={timerange}
              inspectTitle={description}
            />

            {(enableAreaChart || enableBarChart) && <EuiHorizontalRule />}
            <EuiFlexGroup gutterSize="none">
              {enableBarChart && (
                <FlexItem>
                  <VisualizationEmbeddable
                    data-test-subj="embeddable-bar-chart"
                    lensAttributes={barChartLensAttributes}
                    timerange={timerange}
                    id={`${id}-bar-embeddable`}
                    height={ChartHeight}
                    inspectTitle={description}
                  />
                </FlexItem>
              )}

              {enableAreaChart && from != null && to != null && (
                <>
                  <FlexItem>
                    <VisualizationEmbeddable
                      data-test-subj="embeddable-area-chart"
                      lensAttributes={areaChartLensAttributes}
                      timerange={timerange}
                      id={`${id}-area-embeddable`}
                      height={ChartHeight}
                      inspectTitle={description}
                    />
                  </FlexItem>
                </>
              )}
            </EuiFlexGroup>
          </>
        )}
      </EuiPanel>
    </FlexItem>
  );
});

StatItemsComponent.displayName = 'StatItemsComponent';
