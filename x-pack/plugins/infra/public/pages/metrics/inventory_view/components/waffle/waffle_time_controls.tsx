/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiDatePicker, EuiFormControlLayout } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import moment, { Moment } from 'moment';
import React, { useCallback } from 'react';
import { useWaffleTimeContext } from '../../hooks/use_waffle_time';

export const WaffleTimeControls = () => {
  const {
    currentTime,
    isAutoReloading,
    startAutoReload,
    stopAutoReload,
    jumpToTime,
  } = useWaffleTimeContext();

  const currentMoment = moment(currentTime);

  const liveStreamingButton = isAutoReloading ? (
    <EuiButtonEmpty color="primary" iconSide="left" iconType="pause" onClick={stopAutoReload}>
      <FormattedMessage
        id="xpack.infra.waffleTime.stopRefreshingButtonLabel"
        defaultMessage="Stop refreshing"
      />
    </EuiButtonEmpty>
  ) : (
    <EuiButtonEmpty iconSide="left" iconType="play" onClick={startAutoReload}>
      <FormattedMessage
        id="xpack.infra.waffleTime.autoRefreshButtonLabel"
        defaultMessage="Auto-refresh"
      />
    </EuiButtonEmpty>
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
    <EuiFormControlLayout append={liveStreamingButton} data-test-subj="waffleDatePicker">
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
    </EuiFormControlLayout>
  );
};
