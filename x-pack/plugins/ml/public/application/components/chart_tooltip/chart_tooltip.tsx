/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import TooltipTrigger from 'react-popper-tooltip';
import type { ChildrenArg, TooltipTriggerProps } from 'react-popper-tooltip/dist/types';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { TooltipValueFormatter } from '@elastic/charts';

import type { ChartTooltipValue, TooltipData } from './chart_tooltip_service';
import { ChartTooltipService } from './chart_tooltip_service';
import { useChartTooltipStyles } from './chart_tooltip_styles';

const renderHeader = (headerData?: ChartTooltipValue, formatter?: TooltipValueFormatter) => {
  if (!headerData) {
    return null;
  }

  return formatter ? formatter(headerData) : headerData.label;
};

/**
 * Pure component for rendering the tooltip content with a custom layout across the ML plugin.
 */
export const FormattedTooltip: FC<{ tooltipData: TooltipData }> = ({ tooltipData }) => {
  const {
    mlChartTooltip,
    mlChartTooltipList,
    mlChartTooltipHeader,
    mlChartTooltipItem,
    mlChartTooltipLabel,
    mlChartTooltipValue,
  } = useChartTooltipStyles();

  return (
    <div css={mlChartTooltip}>
      {tooltipData.length > 0 && tooltipData[0].skipHeader === undefined && (
        <div css={mlChartTooltipHeader}>{renderHeader(tooltipData[0])}</div>
      )}
      {tooltipData.length > 1 && (
        <div css={mlChartTooltipList}>
          {tooltipData
            .slice(1)
            .map(({ label, value, color, isHighlighted, seriesIdentifier, valueAccessor }) => {
              const classes = classNames({
                // eslint-disable-next-line @typescript-eslint/naming-convention
                echTooltip__rowHighlighted: isHighlighted,
              });

              const renderValue = Array.isArray(value)
                ? value.map((v) => <div key={v}>{v}</div>)
                : value;

              return (
                <div
                  key={`${seriesIdentifier.key}__${valueAccessor}`}
                  css={mlChartTooltipItem}
                  className={classes}
                  style={{
                    borderLeftColor: color,
                  }}
                >
                  <EuiFlexGroup>
                    <EuiFlexItem
                      css={mlChartTooltipLabel}
                      className="eui-textBreakWord"
                      grow={false}
                    >
                      {label}
                    </EuiFlexItem>
                    <EuiFlexItem css={mlChartTooltipValue} className="eui-textBreakAll">
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
};

/**
 * Tooltip component bundled with the {@link ChartTooltipService}
 */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tooltipCallback = useCallback(
    (({ tooltipRef, getTooltipProps }) => {
      return (
        <div
          {...getTooltipProps({
            ref: tooltipRef,
          })}
        >
          <FormattedTooltip tooltipData={tooltipData} />
        </div>
      );
    }) as TooltipTriggerProps['tooltip'],
    [tooltipData]
  );

  const isTooltipShown = tooltipData.length > 0;

  return (
    <TooltipTrigger
      modifiers={[
        {
          name: 'preventOverflow',
          options: {
            rootBoundary: 'viewport',
          },
        },
      ]}
      placement="top-start"
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
