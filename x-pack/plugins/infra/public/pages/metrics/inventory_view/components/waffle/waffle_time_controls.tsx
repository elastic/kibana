/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiDatePicker, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import moment, { Moment } from 'moment';
import React, { useCallback } from 'react';
import { withTheme, EuiTheme } from '../../../../../../../../../src/plugins/kibana_react/common';
import { useWaffleTimeContext } from '../../hooks/use_waffle_time';
import { intervalAsString } from './interval_label';

interface Props {
  theme: EuiTheme | undefined;
}

export const WaffleTimeControls = withTheme(({ theme }: Props) => {
  const {
    currentTime,
    isAutoReloading,
    startAutoReload,
    stopAutoReload,
    jumpToTime,
  } = useWaffleTimeContext();

  const currentMoment = moment(currentTime);

  const liveStreamingButton = isAutoReloading ? (
    <EuiButton color="primary" iconSide="left" iconType="pause" onClick={stopAutoReload}>
      <FormattedMessage
        id="xpack.infra.waffleTime.stopRefreshingButtonLabel"
        defaultMessage="Stop refreshing"
      />
    </EuiButton>
  ) : (
    <EuiButton iconSide="left" iconType="play" onClick={startAutoReload}>
      <FormattedMessage
        id="xpack.infra.waffleTime.autoRefreshButtonLabel"
        defaultMessage="Auto-refresh"
      />
    </EuiButton>
  );

  const handleChangeDate = useCallback(
    (time: Moment | null) => {
      if (time) {
        jumpToTime(time.valueOf());
      }
    },
    [jumpToTime]
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m">
      <EuiFlexItem grow={false} data-test-subj="waffleDatePicker">
        <EuiFormRow
          helpText={
            <FormattedMessage
              id="xpack.infra.homePage.toolbar.showingLastOneMinuteDataText"
              defaultMessage="Last {duration} of data for the selected time"
              values={{ duration: { intervalAsString } }}
            />
          }
        >
          <EuiDatePicker
            dateFormat="L LTS"
            disabled={isAutoReloading}
            injectTimes={currentMoment ? [currentMoment] : []}
            isLoading={isAutoReloading}
            onChange={handleChangeDate}
            popperPlacement="top-end"
            selected={currentMoment}
            shouldCloseOnSelect
            showTimeSelect
            timeFormat="LT"
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{liveStreamingButton}</EuiFlexItem>
    </EuiFlexGroup>
  );
});
