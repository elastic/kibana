/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import TooltipTrigger from 'react-popper-tooltip';
import { TooltipValueFormatter } from '@elastic/charts';

import './_index.scss';

import { ChartTooltipService, ChartTooltipValue, TooltipData } from './chart_tooltip_service';

type RefValue = HTMLElement | null;

const renderHeader = (headerData?: ChartTooltipValue, formatter?: TooltipValueFormatter) => {
  if (!headerData) {
    return null;
  }

  return formatter ? formatter(headerData) : headerData.label;
};

const Tooltip: FC<{ service: ChartTooltipService }> = ({ service }) => {
  const [tooltipData, setData] = useState<TooltipData>([]);
  const tooltipTriggerRef = useRef<RefValue>(null);

  useEffect(() => {
    const subscription = service.tooltipState$.subscribe(tooltipState => {
      tooltipTriggerRef.current = tooltipState.target;
      setData(tooltipState.tooltipData);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isTooltipShown = tooltipData.length > 0;

  return (
    <TooltipTrigger
      placement="right-start"
      trigger="none"
      tooltipShown={isTooltipShown}
      tooltip={({ tooltipRef, getTooltipProps }) => (
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
                    /* eslint @typescript-eslint/camelcase:0 */
                    echTooltip__rowHighlighted: isHighlighted,
                  });
                  return (
                    <div
                      key={`${seriesIdentifier.key}__${valueAccessor}`}
                      className={classes}
                      style={{
                        borderLeftColor: color,
                      }}
                    >
                      <span className="mlChartTooltip__label">{label}</span>
                      <span className="mlChartTooltip__value">{value}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    >
      {({ triggerRef }) => {
        triggerRef(tooltipTriggerRef.current);
        // actual trigger is resolved by the service, hence don't render
        return null;
      }}
    </TooltipTrigger>
  );
};

export const MlTooltipComponent: FC<{ children: React.ReactElement }> = ({ children }) => {
  const service = useMemo(() => new ChartTooltipService(), []);

  return (
    <>
      <Tooltip service={service} />
      {React.cloneElement(children, { ...children.props, tooltipService: service })}
    </>
  );
};
