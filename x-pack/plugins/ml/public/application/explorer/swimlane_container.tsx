/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useState } from 'react';
import {
  EuiText,
  EuiLoadingChart,
  EuiResizeObserver,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { throttle } from 'lodash';
import {
  ExplorerSwimlane,
  ExplorerSwimlaneProps,
} from '../../application/explorer/explorer_swimlane';

import { MlTooltipComponent } from '../../application/components/chart_tooltip';
import { SwimLanePagination } from './swimlane_pagination';
import { RESIZE_IGNORED_DIFF_PX, SWIMLANE_TYPE } from './explorer_constants';
import { ViewBySwimLaneData } from './explorer_utils';

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
  Omit<ExplorerSwimlaneProps, 'chartWidth' | 'tooltipService'> & {
    onResize: (width: number) => void;
    fromPage?: number;
    perPage?: number;
    swimlaneLimit?: number;
    onPaginationChange?: (arg: { perPage?: number; fromPage?: number }) => void;
  }
> = ({ children, onResize, perPage, fromPage, swimlaneLimit, onPaginationChange, ...props }) => {
  const [chartWidth, setChartWidth] = useState<number>(0);

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
    props.swimlaneData && props.swimlaneData.laneLabels && props.swimlaneData.laneLabels.length > 0;

  const isPaginationVisible =
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
            style={{ width: '100%', height: '100%' }}
            ref={(el) => {
              resizeRef(el);
            }}
          >
            <EuiFlexItem style={{ width: '100%', overflowY: 'auto' }} grow={false}>
              <EuiText color="subdued" size="s">
                {showSwimlane ? (
                  <MlTooltipComponent>
                    {(tooltipService) => (
                      <ExplorerSwimlane
                        chartWidth={chartWidth}
                        tooltipService={tooltipService}
                        {...props}
                      />
                    )}
                  </MlTooltipComponent>
                ) : (
                  <EuiText textAlign={'center'}>
                    <EuiLoadingChart size="xl" />
                  </EuiText>
                )}
              </EuiText>
            </EuiFlexItem>
            {isPaginationVisible && (
              <EuiFlexItem grow={false}>
                <SwimLanePagination
                  cardinality={swimlaneLimit!}
                  fromPage={fromPage}
                  perPage={perPage}
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
