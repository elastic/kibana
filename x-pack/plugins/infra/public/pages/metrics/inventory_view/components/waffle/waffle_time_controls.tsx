/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiDatePicker, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import moment, { Moment } from 'moment';
import React, { useCallback } from 'react';
import { withTheme, EuiTheme } from '../../../../../../../observability/public';
import { useWaffleTimeContext } from '../../hooks/use_waffle_time';

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
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem
        grow={false}
        style={{
          border: theme?.eui.euiFormInputGroupBorder,
          boxShadow: `0px 3px 2px ${theme?.eui.euiTableActionsBorderColor}, 0px 1px 1px ${theme?.eui.euiTableActionsBorderColor}`,
          marginRight: theme?.eui.paddingSizes.m,
        }}
        data-test-subj="waffleDatePicker"
      >
        <EuiDatePicker
          className="euiFieldText--inGroup"
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
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{liveStreamingButton}</EuiFlexItem>
    </EuiFlexGroup>
  );
});
