/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import TooltipTrigger from 'react-popper-tooltip';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { TooltipValueFormatter } from '@elastic/charts';

import './_index.scss';

import { ChildrenArg, TooltipTriggerProps } from 'react-popper-tooltip/dist/types';
import { ChartTooltipService, ChartTooltipValue, TooltipData } from './chart_tooltip_service';

const renderHeader = (headerData?: ChartTooltipValue, formatter?: TooltipValueFormatter) => {
  if (!headerData) {
    return null;
  }

  return formatter ? formatter(headerData) : headerData.label;
};

const Tooltip: FC<{ service: ChartTooltipService }> = React.memo(({ service }) => {
  const [tooltipData, setData] = useState<TooltipData>([]);
  const refCallback = useRef<ChildrenArg['triggerRef']>();

  useEffect(() => {
    const subscription = service.tooltipState$.subscribe((tooltipState) => {
      if (refCallback.current && typeof refCallback.current === 'function') {
        // update trigger
        refCallback.current(tooltipState.target);
      }
      setData(tooltipState.tooltipData);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const triggerCallback = useCallback(
    (({ triggerRef }) => {
      // obtain the reference to the trigger setter callback
      // to update the target based on changes from the service.
      refCallback.current = triggerRef;
      // actual trigger is resolved by the service, hence don't render
      return null;
    }) as TooltipTriggerProps['children'],
    []
  );

  const tooltipCallback = useCallback(
    (({ tooltipRef, getTooltipProps }) => {
      return (
        <div
          {...getTooltipProps({
            ref: tooltipRef,
            className: 'mlChartTooltip',
          })}
        >
          {tooltipData.length > 0 && tooltipData[0].skipHeader === undefined && (
            <div className="mlChartTooltip__header">{renderHeader(tooltipData[0])}</div>
          )}
          {tooltipData.length > 1 && (
            <div className="mlChartTooltip__list">
              {tooltipData
                .slice(1)
                .map(({ label, value, color, isHighlighted, seriesIdentifier, valueAccessor }) => {
                  const classes = classNames('mlChartTooltip__item', {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    echTooltip__rowHighlighted: isHighlighted,
                  });

                  const renderValue = Array.isArray(value)
                    ? value.map((v) => <div key={v}>{v}</div>)
                    : value;

                  return (
                    <div
                      key={`${seriesIdentifier.key}__${valueAccessor}`}
                      className={classes}
                      style={{
                        borderLeftColor: color,
                      }}
                    >
                      <EuiFlexGroup>
                        <EuiFlexItem
                          className="eui-textBreakWord mlChartTooltip__label"
                          grow={false}
                        >
                          {label}
                        </EuiFlexItem>
                        <EuiFlexItem className="eui-textBreakAll mlChartTooltip__value">
                          {renderValue}
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      );
    }) as TooltipTriggerProps['tooltip'],
    [tooltipData]
  );

  const isTooltipShown = tooltipData.length > 0;

  return (
    <TooltipTrigger
      modifiers={{
        preventOverflow: {
          boundariesElement: 'window',
        },
      }}
      placement="right-start"
      trigger="none"
      tooltipShown={isTooltipShown}
      tooltip={tooltipCallback}
    >
      {triggerCallback}
    </TooltipTrigger>
  );
});

interface MlTooltipComponentProps {
  children: (tooltipService: ChartTooltipService) => React.ReactElement;
}

export const MlTooltipComponent: FC<MlTooltipComponentProps> = ({ children }) => {
  const service = useMemo(() => new ChartTooltipService(), []);

  return (
    <>
      <Tooltip service={service} />
      {children(service)}
    </>
  );
};
