/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useRef, useState } from 'react';
import {
  EuiText,
  EuiLoadingChart,
  EuiResizeObserver,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
} from '@elastic/eui';

import { throttle } from 'lodash';
import {
  ExplorerSwimlane,
  ExplorerSwimlaneProps,
} from '../../application/explorer/explorer_swimlane';

import { MlTooltipComponent } from '../../application/components/chart_tooltip';
import { SwimLanePagination } from './swimlane_pagination';
import { SWIMLANE_TYPE } from './explorer_constants';
import { ViewBySwimLaneData } from './explorer_utils';

/**
 * Ignore insignificant resize, e.g. browser scrollbar appearance.
 */
const RESIZE_IGNORED_DIFF_PX = 20;
const RESIZE_THROTTLE_TIME_MS = 500;

export function isViewBySwimLaneData(arg: any): arg is ViewBySwimLaneData {
  return arg && arg.hasOwnProperty('cardinality');
}

/**
 * Anomaly swim lane container responsible for handling resizing, pagination and injecting
 * tooltip service.
 *
 * @param children
 * @param onResize
 * @param perPage
 * @param fromPage
 * @param swimlaneLimit
 * @param onPaginationChange
 * @param props
 * @constructor
 */
export const SwimlaneContainer: FC<
  Omit<ExplorerSwimlaneProps, 'chartWidth' | 'tooltipService' | 'parentRef'> & {
    onResize: (width: number) => void;
    fromPage?: number;
    perPage?: number;
    swimlaneLimit?: number;
    onPaginationChange?: (arg: { perPage?: number; fromPage?: number }) => void;
    isLoading: boolean;
    noDataWarning: string | JSX.Element | null;
  }
> = ({
  children,
  onResize,
  perPage,
  fromPage,
  swimlaneLimit,
  onPaginationChange,
  isLoading,
  noDataWarning,
  ...props
}) => {
  const [chartWidth, setChartWidth] = useState<number>(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const resizeHandler = useCallback(
    throttle((e: { width: number; height: number }) => {
      const labelWidth = 200;
      const resultNewWidth = e.width - labelWidth;
      if (Math.abs(resultNewWidth - chartWidth) > RESIZE_IGNORED_DIFF_PX) {
        setChartWidth(resultNewWidth);
        onResize(resultNewWidth);
      }
    }, RESIZE_THROTTLE_TIME_MS),
    [chartWidth]
  );

  const showSwimlane =
    props.swimlaneData &&
    props.swimlaneData.laneLabels &&
    props.swimlaneData.laneLabels.length > 0 &&
    props.swimlaneData.points.length > 0;

  const isPaginationVisible =
    (showSwimlane || isLoading) &&
    swimlaneLimit !== undefined &&
    onPaginationChange &&
    props.swimlaneType === SWIMLANE_TYPE.VIEW_BY &&
    fromPage &&
    perPage;

  return (
    <>
      <EuiResizeObserver onResize={resizeHandler}>
        {(resizeRef) => (
          <EuiFlexGroup
            gutterSize={'none'}
            direction={'column'}
            style={{ width: '100%', height: '100%', overflow: 'hidden' }}
            ref={(el) => {
              resizeRef(el);
            }}
            data-test-subj="mlSwimLaneContainer"
          >
            <EuiFlexItem style={{ width: '100%', overflowY: 'auto' }} grow={false}>
              <div ref={wrapperRef}>
                <EuiText color="subdued" size="s">
                  {showSwimlane && !isLoading && (
                    <MlTooltipComponent>
                      {(tooltipService) => (
                        <ExplorerSwimlane
                          {...props}
                          chartWidth={chartWidth}
                          tooltipService={tooltipService}
                          parentRef={wrapperRef}
                        />
                      )}
                    </MlTooltipComponent>
                  )}
                  {isLoading && (
                    <EuiText textAlign={'center'}>
                      <EuiLoadingChart
                        size="xl"
                        mono={true}
                        data-test-subj="mlSwimLaneLoadingIndicator"
                      />
                    </EuiText>
                  )}
                  {!isLoading && !showSwimlane && (
                    <EuiEmptyPrompt
                      titleSize="xs"
                      style={{ padding: 0 }}
                      title={<h2>{noDataWarning}</h2>}
                    />
                  )}
                </EuiText>
              </div>
            </EuiFlexItem>

            {isPaginationVisible && (
              <EuiFlexItem grow={false}>
                <SwimLanePagination
                  cardinality={swimlaneLimit!}
                  fromPage={fromPage!}
                  perPage={perPage!}
                  onPaginationChange={onPaginationChange!}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
      </EuiResizeObserver>
    </>
  );
};
