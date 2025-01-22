/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { usePopperTooltip } from 'react-popper-tooltip';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { TooltipValueFormatter } from '@elastic/charts';

import './_index.scss';

import type { ChartTooltipValue, TooltipData } from './chart_tooltip_service';
import { ChartTooltipService } from './chart_tooltip_service';

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
  return (
    <div className="mlChartTooltip">
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
                    <EuiFlexItem className="eui-textBreakWord mlChartTooltip__label" grow={false}>
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
};

/**
 * Tooltip component bundled with the {@link ChartTooltipService}
 */
const Tooltip: FC<{ service: ChartTooltipService }> = React.memo(({ service }) => {
  const [tooltipData, setData] = useState<TooltipData>([]);

  const { getTooltipProps, setTooltipRef, setTriggerRef } = usePopperTooltip(
    {
      placement: 'top-start',
      trigger: null,
      delayHide: 1000,
    },
    {
      modifiers: [
        {
          name: 'preventOverflow',
          options: {
            rootBoundary: 'viewport',
          },
        },
      ],
    }
  );

  useEffect(() => {
    const subscription = service.tooltipState$.subscribe((tooltipState) => {
      if (setTriggerRef && typeof setTriggerRef === 'function') {
        // update trigger
        setTriggerRef(tooltipState.target);
      }
      setData(tooltipState.tooltipData);
    });
    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isTooltipShown = tooltipData.length > 0;

  return (
    <>
      {isTooltipShown && (
        <div ref={setTooltipRef} {...getTooltipProps({ className: 'tooltip-container' })}>
          <FormattedTooltip tooltipData={tooltipData} />
        </div>
      )}
    </>
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
