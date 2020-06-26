/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useState } from 'react';
import { EuiResizeObserver, EuiText } from '@elastic/eui';

import { throttle } from 'lodash';
import {
  ExplorerSwimlane,
  ExplorerSwimlaneProps,
} from '../../application/explorer/explorer_swimlane';

import { MlTooltipComponent } from '../../application/components/chart_tooltip';
import { SwimLanePagination } from './swimlane_pagination';
import { SWIMLANE_TYPE } from './explorer_constants';
import { ViewBySwimLaneData } from './explorer_utils';

const RESIZE_THROTTLE_TIME_MS = 500;

export function isViewBySwimLaneData(arg: any): arg is ViewBySwimLaneData {
  return arg.hasOwnProperty('cardinality');
}

export const SwimlaneContainer: FC<
  Omit<ExplorerSwimlaneProps, 'chartWidth' | 'tooltipService'> & {
    onResize: (width: number) => void;
    fromPage?: number;
    perPage?: number;
  }
> = ({ children, onResize, perPage, fromPage, ...props }) => {
  const [chartWidth, setChartWidth] = useState<number>(0);

  const resizeHandler = useCallback(
    throttle((e: { width: number; height: number }) => {
      const labelWidth = 200;
      setChartWidth(e.width - labelWidth);
      onResize(e.width);
    }, RESIZE_THROTTLE_TIME_MS),
    []
  );

  return (
    <>
      <EuiResizeObserver onResize={resizeHandler}>
        {(resizeRef) => (
          <div
            ref={(el) => {
              resizeRef(el);
            }}
          >
            <div style={{ width: '100%' }}>
              <EuiText color="subdued" size="s">
                <MlTooltipComponent>
                  {(tooltipService) => (
                    <ExplorerSwimlane
                      chartWidth={chartWidth}
                      tooltipService={tooltipService}
                      {...props}
                    />
                  )}
                </MlTooltipComponent>
              </EuiText>
            </div>
          </div>
        )}
      </EuiResizeObserver>
      {props.swimlaneType === SWIMLANE_TYPE.VIEW_BY && isViewBySwimLaneData(props.swimlaneData) && (
        <SwimLanePagination
          cardinality={props.swimlaneData.cardinality}
          fromPage={fromPage}
          perPage={perPage}
        />
      )}
    </>
  );
};
