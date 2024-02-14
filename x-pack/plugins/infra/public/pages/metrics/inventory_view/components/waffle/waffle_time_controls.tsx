/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiDatePicker, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import moment, { Moment } from 'moment';
import React, { useCallback } from 'react';
import { EuiTheme, withTheme } from '@kbn/react-kibana-context-styled';
import { InventoryPageCallbacks } from '../../../../../observability_infra/inventory_page/state';
import { convertIntervalToString } from '../../../../../utils/convert_interval_to_string';

interface Props {
  theme: EuiTheme | undefined;
  interval: string;
  currentTime: number;
  isAutoReloading: boolean;
  inventoryPageCallbacks: InventoryPageCallbacks;
}

export const WaffleTimeControls = withTheme(
  ({ interval, currentTime, isAutoReloading, inventoryPageCallbacks }: Props) => {
    const currentMoment = moment(currentTime);
    const intervalAsString = convertIntervalToString(interval);

    const liveStreamingButton = isAutoReloading ? (
      <EuiButton
        data-test-subj="infraWaffleTimeControlsStopRefreshingButton"
        color="primary"
        iconSide="left"
        iconType="pause"
        onClick={() => {}}
      >
        <FormattedMessage
          id="xpack.infra.waffleTime.stopRefreshingButtonLabel"
          defaultMessage="Stop refreshing"
        />
      </EuiButton>
    ) : (
      <EuiButton
        data-test-subj="infraWaffleTimeControlsAutoRefreshButton"
        iconSide="left"
        iconType="play"
        onClick={() => {}}
      >
        <FormattedMessage
          id="xpack.infra.waffleTime.autoRefreshButtonLabel"
          defaultMessage="Auto-refresh"
        />
      </EuiButton>
    );

    const handleChangeDate = useCallback(
      (time: Moment | null) => {
        inventoryPageCallbacks.updateTime({
          currentTime: time?.valueOf() ?? Date.now(),
          isAutoReloading,
        });
      },
      [inventoryPageCallbacks, isAutoReloading]
    );

    return (
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false} data-test-subj="waffleDatePicker">
          <EuiToolTip
            content={`Last ${intervalAsString} of data for the selected time`}
            delay="long"
            display="inlineBlock"
            position="top"
            data-test-subj="waffleDatePickerIntervalTooltip"
          >
            <EuiDatePicker
              dateFormat="L LTS"
              disabled={isAutoReloading}
              injectTimes={currentMoment ? [currentMoment] : []}
              isLoading={isAutoReloading}
              onChange={handleChangeDate}
              popoverPlacement="upRight"
              selected={currentMoment}
              shouldCloseOnSelect
              showTimeSelect
              timeFormat="LT"
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{liveStreamingButton}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
