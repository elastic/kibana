/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rotation, BrushEndListener, ElementClickListener } from '@elastic/charts';
import { ScaleType } from '@elastic/charts';
import type { IconType } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiHorizontalRule,
  EuiIcon,
  EuiButtonIcon,
  EuiTitle,
  EuiStat,
} from '@elastic/eui';
import { get, getOr } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';
import { useQueryToggle } from '../../containers/query_toggle';

import type { ChartSeriesConfigs } from '../charts/common';

import type { LensAttributes } from '../visualization_actions/types';
import * as i18n from '../../containers/query_toggle/translations';
import { LensEmbeddable } from '../visualization_actions/lens_embeddable';

const FlexGroup = styled(EuiFlexGroup)`
  .no-margin {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }
`;
const FlexItem = styled(EuiFlexItem)`
  min-width: 0;
  position: relative;
`;
FlexItem.displayName = 'FlexItem';

const MetrixItem = styled(EuiFlexItem)`
  &.euiFlexItem {
    flex-basis: 0;
    flex-grow: 0;
  }
`;
MetrixItem.displayName = 'MetrixItem';

const StatValue = styled(EuiTitle)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

StatValue.displayName = 'StatValue';

const ChartHeight = '90px';

interface StatItem {
  color?: string;
  description?: string;
  icon?: IconType;
  key: string;
  name?: string;
  lensAttributes?: LensAttributes;
}

export interface StatItems {
  areachartConfigs?: ChartSeriesConfigs;
  barchartConfigs?: ChartSeriesConfigs;
  description?: string;
  enableAreaChart?: boolean;
  enableBarChart?: boolean;
  fields: StatItem[];
  grow?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | true | false | null;
  index?: number;
  key: string;
  statKey?: string;
  barChartLensAttributes?: LensAttributes;
  areaChartLensAttributes?: LensAttributes;
}

export interface StatItemsProps extends StatItems {
  from: string;
  id: string;
  to: string;
}

export const numberFormatter = (value: string | number): string => value.toLocaleString();
const statItemBarchartRotation: Rotation = 90;
const statItemChartCustomHeight = 74;

export const areachartConfigs = (config?: {
  xTickFormatter: (value: number) => string;
  onBrushEnd?: BrushEndListener;
}) => ({
  series: {
    xScaleType: ScaleType.Time,
    yScaleType: ScaleType.Linear,
  },
  axis: {
    xTickFormatter: get('xTickFormatter', config),
    yTickFormatter: numberFormatter,
  },
  settings: {
    onBrushEnd: getOr(() => {}, 'onBrushEnd', config),
  },
  customHeight: statItemChartCustomHeight,
});

export const barchartConfigs = (config?: { onElementClick?: ElementClickListener }) => ({
  series: {
    xScaleType: ScaleType.Ordinal,
    yScaleType: ScaleType.Linear,
    stackAccessors: ['y0'],
  },
  axis: {
    xTickFormatter: numberFormatter,
  },
  settings: {
    onElementClick: getOr(() => {}, 'onElementClick', config),
    rotation: statItemBarchartRotation,
  },
  customHeight: statItemChartCustomHeight,
});

export const useKpiMatrixStatus = (
  mappings: Readonly<StatItems[]>,
  id: string,
  from: string,
  to: string
): StatItemsProps[] =>
  mappings.map((stat) => ({
    ...stat,
    id,
    key: `kpi-summary-${stat.key}`,
    statKey: `${stat.key}`,
    from,
    to,
  }));

const StyledTitle = styled.h6`
  line-height: 200%;
`;
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

    const { toggleStatus, setToggleStatus } = useQueryToggle(id);

    const toggleQuery = useCallback(
      (status: boolean) => {
        setToggleStatus(status);
      },
      [setToggleStatus]
    );
    const toggle = useCallback(() => toggleQuery(!toggleStatus), [toggleQuery, toggleStatus]);

    return (
      <FlexItem grow={grow} data-test-subj={`stat-${statKey}`}>
        <EuiPanel hasBorder>
          <FlexGroup gutterSize={'none'}>
            <EuiFlexItem className={toggleStatus ? '' : 'no-margin'}>
              <EuiFlexGroup gutterSize={'none'} responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    aria-label={i18n.QUERY_BUTTON_TITLE(toggleStatus)}
                    data-test-subj="query-toggle-stat"
                    color="text"
                    display="empty"
                    iconType={toggleStatus ? 'arrowDown' : 'arrowRight'}
                    onClick={toggle}
                    size="xs"
                    title={i18n.QUERY_BUTTON_TITLE(toggleStatus)}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="xxxs">
                    <StyledTitle>{description}</StyledTitle>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </FlexGroup>

          {toggleStatus && (
            <>
              <EuiFlexGroup gutterSize="none">
                {fields.map((field) => (
                  <FlexItem key={`stat-items-field-${field.key}`}>
                    <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
                      {field.icon && (
                        <FlexItem grow={false}>
                          <EuiIcon
                            type={field.icon}
                            color={field.color}
                            size="l"
                            data-test-subj="stat-icon"
                          />
                        </FlexItem>
                      )}

                      <MetrixItem>
                        {field.lensAttributes && (
                          <LensEmbeddable
                            data-test-subj="embeddable-metric"
                            height="36px"
                            id={id}
                            lensAttributes={field.lensAttributes}
                            timerange={timerange}
                            inspectTitle={description}
                            metricAlignment={!field.icon && !field.description ? 'left' : 'center'}
                          />
                        )}
                      </MetrixItem>
                      {field.description != null && (
                        <FlexItem>
                          <EuiStat title={field.description} description={null} titleSize="m" />
                        </FlexItem>
                      )}
                    </EuiFlexGroup>
                  </FlexItem>
                ))}
              </EuiFlexGroup>

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
