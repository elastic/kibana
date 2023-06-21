/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo, useState } from 'react';
import moment, { type Moment } from 'moment';
import {
  EuiDatePicker,
  EuiDatePickerRange,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFormRow,
  EuiIconTip,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useMlKibana } from '../../../contexts/kibana';

interface CustomUrlTimeRangePickerProps {
  onCustomTimeRangeChange: (customTimeRange?: { start: Moment; end: Moment }) => void;
  customTimeRange?: { start: Moment; end: Moment };
}

/*
 * React component for the form for adding a custom time range.
 */
export const CustomTimeRangePicker: FC<CustomUrlTimeRangePickerProps> = ({
  onCustomTimeRangeChange,
  customTimeRange,
}) => {
  const [showCustomTimeRangeSelector, setShowCustomTimeRangeSelector] = useState<boolean>(false);
  const {
    services: {
      data: {
        query: {
          timefilter: { timefilter },
        },
      },
    },
  } = useMlKibana();

  const onCustomTimeRangeSwitchChange = (checked: boolean) => {
    if (checked === false) {
      // Clear the custom time range so it isn't persisted
      onCustomTimeRangeChange(undefined);
    }
    setShowCustomTimeRangeSelector(checked);
  };

  // If the custom time range is not set, default to the timefilter settings
  const currentTimeRange = useMemo(
    () =>
      customTimeRange ?? {
        start: moment(timefilter.getAbsoluteTime().from),
        end: moment(timefilter.getAbsoluteTime().to),
      },
    [customTimeRange, timefilter]
  );

  const handleStartChange = (date: moment.Moment) => {
    onCustomTimeRangeChange({ ...currentTimeRange, start: date });
  };
  const handleEndChange = (date: moment.Moment) => {
    onCustomTimeRangeChange({ ...currentTimeRange, end: date });
  };

  const { start, end } = currentTimeRange;

  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize={'none'}>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            content={i18n.translate('xpack.ml.customUrlsEditor.customTimeRangeTooltip', {
              defaultMessage: 'If not set, time range defaults to global settings.',
            })}
            position="top"
            type="iInCircle"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            display="columnCompressedSwitch"
            label={
              <FormattedMessage
                id="xpack.ml.customUrlsEditor.customTimeRangeSwitch"
                defaultMessage="Add custom time range?"
              />
            }
          >
            <EuiSwitch
              showLabel={false}
              label={
                <FormattedMessage
                  id="xpack.ml.customUrlsEditor.addCustomTimeRangeSwitchLabel"
                  defaultMessage="Add custom time range switch"
                />
              }
              checked={showCustomTimeRangeSelector}
              onChange={(e) => onCustomTimeRangeSwitchChange(e.target.checked)}
              compressed
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {showCustomTimeRangeSelector ? (
        <>
          <EuiSpacer size="s" />
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.customUrlsEditor.customTimeRangeLabel"
                defaultMessage="Custom time range"
              />
            }
          >
            <EuiDatePickerRange
              data-test-subj={`mlCustomUrlsDateRange`}
              isInvalid={start > end}
              startDateControl={
                <EuiDatePicker
                  selected={start}
                  onChange={handleStartChange}
                  startDate={start}
                  endDate={end}
                  aria-label={i18n.translate('xpack.ml.customUrlsEditor.customTimeRangeStartDate', {
                    defaultMessage: 'Start date',
                  })}
                  showTimeSelect
                />
              }
              endDateControl={
                <EuiDatePicker
                  selected={end}
                  onChange={handleEndChange}
                  startDate={start}
                  endDate={end}
                  aria-label={i18n.translate('xpack.ml.customUrlsEditor.customTimeRangeEndDate', {
                    defaultMessage: 'End date',
                  })}
                  showTimeSelect
                />
              }
            />
          </EuiFormRow>
        </>
      ) : null}
    </>
  );
};
