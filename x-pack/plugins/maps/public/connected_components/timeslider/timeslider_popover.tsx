/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiPopover,
  EuiContextMenuPanel,
  EuiButton,
  EuiContextMenuItem,
  EuiForm,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldNumber,
  EuiSelect,
  EuiHorizontalRule,
  EuiText,
  EuiPopoverTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  getTimeRanges,
  getCustomLabel,
  durationAsString,
  filterOptions,
  getCustomInterval,
} from './time_utils';

interface Props {
  timeRangeBounds: any;
  timeRangeStep: number;
  handler: Function;
  customIntervalHandler: Function;
}

export const TimeSliderPopover = (props: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const min = props.timeRangeBounds.min.valueOf();
  const max = props.timeRangeBounds.max.valueOf();
  const filteredOptions = filterOptions(max - min);

  let labelText;
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
            ms: 0,
            default: true,
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

  const onFormSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const target = e.target as typeof e.target & {
      time: { value: string };
      type: { value: string };
    };
    setShowErrors(false);
    if (target.time.value && getCustomInterval(target) < max - min) {
      props.customIntervalHandler(e);
      setLabel(getCustomLabel(target));
      setIsOpen(false);
    } else {
      setShowErrors(true);
    }
  };
  const error = i18n.translate('xpack.maps.timeslider.invalidSelectedInterval', {
    defaultMessage:
      'The selected interval cannot be empty or exceed the global time window. Please reduce the interval or change the global time window.',
  });

  const intervalForm = (
    <>
      <EuiPopoverTitle>
        {i18n.translate('xpack.maps.timeslider.intervalsTitle', {
          defaultMessage: 'Intervals',
        })}
      </EuiPopoverTitle>
      <EuiForm
        className="mapTimeslider_form"
        component="form"
        onSubmit={onFormSubmit}
        isInvalid={showErrors}
        error={error}
      >
        <EuiFlexGroup gutterSize="s" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiFormRow>
              <EuiFieldNumber name="time" compressed min={1} max={999} />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow>
              <EuiSelect name="type" compressed options={filteredOptions} />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow>
              <EuiButton type="submit" size="s">
                {i18n.translate('xpack.maps.timeslider.applyButton', {
                  defaultMessage: 'Apply',
                })}
              </EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
      <EuiHorizontalRule margin="xs" />
    </>
  );

  return (
    <div className="mapTimeslider__timeRange">
      {renderFilteredPeriods()?.length > 1 && (
        <EuiPopover
          id="metricsPopover"
          isOpen={isOpen}
          closePopover={() => setIsOpen(false)}
          panelPaddingSize="s"
          ownFocus
          anchorPosition="upCenter"
          button={
            <EuiButton
              size="s"
              className="mapTimeslider__euiButton-controls"
              onClick={() => {
                setIsOpen((x) => !x);
                setShowErrors(false);
              }}
            >
              {label}
            </EuiButton>
          }
        >
          {intervalForm}

          <EuiText size="xs">
            <b>
              {i18n.translate('xpack.maps.timeslider.commonlyUsed', {
                defaultMessage: 'Commonly used',
              })}
            </b>
          </EuiText>
          <EuiContextMenuPanel size="s" items={renderFilteredPeriods()} />
        </EuiPopover>
      )}
    </div>
  );
};
