/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiPanel, EuiHorizontalRule } from '@elastic/eui';
import React, { useMemo } from 'react';
import deepEqual from 'fast-deep-equal';

import { LensEmbeddable } from '../visualization_actions/lens_embeddable';
import type { StatItemsProps } from './types';
import { ChartHeight, FlexItem } from './utils';
import { useToggleStatus } from './use_toggle_status';
import { StatItemHeader } from './stat_item_header';
import { Metric } from './metric';

export const StatItemsComponent = React.memo<StatItemsProps>(
  ({
    description,
    enableAreaChart,
    enableBarChart,
    fields,
    from,
    grow,
    id,
    statKey = 'item',
    to,
    barChartLensAttributes,
    areaChartLensAttributes,
  }) => {
    const timerange = useMemo(
      () => ({
        from,
        to,
      }),
      [from, to]
    );

    const { toggleStatus, toggle } = useToggleStatus({ id });

    return (
      <FlexItem grow={grow} data-test-subj={`stat-${statKey}`}>
        <EuiPanel hasBorder>
          <StatItemHeader toggle={toggle} toggleStatus={toggleStatus} description={description} />

          {toggleStatus && (
            <>
              <Metric fields={fields} id={id} timerange={timerange} inspectTitle={description} />

              {(enableAreaChart || enableBarChart) && (
                <EuiHorizontalRule data-test-subj="stat-item-separator" />
              )}
              <EuiFlexGroup gutterSize="none">
                {enableBarChart && barChartLensAttributes && (
                  <FlexItem>
                    <LensEmbeddable
                      data-test-subj="embeddable-bar-chart"
                      lensAttributes={barChartLensAttributes}
                      timerange={timerange}
                      id={id}
                      height={ChartHeight}
                      inspectTitle={description}
                    />
                  </FlexItem>
                )}

                {enableAreaChart && from != null && to != null && (
                  <FlexItem>
                    {areaChartLensAttributes && (
                      <LensEmbeddable
                        data-test-subj="embeddable-area-chart"
                        lensAttributes={areaChartLensAttributes}
                        timerange={timerange}
                        id={id}
                        height={ChartHeight}
                        inspectTitle={description}
                      />
                    )}
                  </FlexItem>
                )}
              </EuiFlexGroup>
            </>
          )}
        </EuiPanel>
      </FlexItem>
    );
  },
  (prevProps, nextProps) =>
    prevProps.description === nextProps.description &&
    prevProps.enableAreaChart === nextProps.enableAreaChart &&
    prevProps.enableBarChart === nextProps.enableBarChart &&
    prevProps.from === nextProps.from &&
    prevProps.grow === nextProps.grow &&
    prevProps.id === nextProps.id &&
    prevProps.index === nextProps.index &&
    prevProps.statKey === nextProps.statKey &&
    prevProps.to === nextProps.to &&
    deepEqual(prevProps.fields, nextProps.fields)
);

StatItemsComponent.displayName = 'StatItemsComponent';
