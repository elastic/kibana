/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPopover, EuiContextMenuPanel, EuiButton, EuiContextMenuItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getTimeRanges, durationAsString } from './time_utils';

interface Props {
  timeRangeBounds: any;
  timeRangeStep: number;
  handler: Function;
}

export const TimeSliderPopover = (props: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const min = props.timeRangeBounds.min.valueOf();
  const max = props.timeRangeBounds.max.valueOf();

  let labelText: string;

  if (props.timeRangeStep === 1 || props.timeRangeStep > max - min) {
    labelText = i18n.translate('xpack.maps.timeslider.autoPeriod', { defaultMessage: 'Auto' });
  } else {
    labelText = durationAsString(props.timeRangeStep);
  }

  const [label, setLabel] = useState(labelText);

  const renderFilteredPeriods = () => {
    const filteredPeriods = getTimeRanges(props.timeRangeBounds).map(
      (range: { label: string; ms: number }, index: number) => {
        return (
          <EuiContextMenuItem
            key={index}
            onClick={() => {
              props.handler(range);
              setIsOpen(false);
              setLabel(range.label);
            }}
          >
            {range.label}
          </EuiContextMenuItem>
        );
      }
    );

    filteredPeriods?.unshift(
      <EuiContextMenuItem
        key="default"
        onClick={() => {
          props.handler({
            label: i18n.translate('xpack.maps.timeslider.autoPeriod', {
              defaultMessage: 'Auto',
            }),
            ms: 1,
          });
          setIsOpen(false);
          setLabel(i18n.translate('xpack.maps.timeslider.autoPeriod', { defaultMessage: 'Auto' }));
        }}
      >
        {i18n.translate('xpack.maps.timeslider.autoPeriod', {
          defaultMessage: 'Auto',
        })}
      </EuiContextMenuItem>
    );

    return filteredPeriods;
  };

  return (
    <div className="mapTimeslider__timeRange">
      {renderFilteredPeriods()?.length > 1 && (
        <EuiPopover
          id="metricsPopover"
          isOpen={isOpen}
          closePopover={() => setIsOpen(false)}
          panelPaddingSize="none"
          ownFocus
          anchorPosition="upCenter"
          button={
            <EuiButton
              size="s"
              className="mapTimeslider__euiButton-controls"
              onClick={() => {
                setIsOpen((x) => !x);
              }}
            >
              {label}
            </EuiButton>
          }
        >
          <EuiContextMenuPanel size="s" items={renderFilteredPeriods()} />
        </EuiPopover>
      )}
    </div>
  );
};
