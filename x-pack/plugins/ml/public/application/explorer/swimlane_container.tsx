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

const RESIZE_THROTTLE_TIME_MS = 500;

export const SwimlaneContainer: FC<
  Omit<ExplorerSwimlaneProps, 'chartWidth' | 'tooltipService'> & {
    onResize: (width: number) => void;
  }
> = ({ children, onResize, ...props }) => {
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
  );
};
