/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiPopoverTitle,
  EuiPopover,
  EuiPopoverFooter,
} from '@elastic/eui';
import { useSelector } from 'react-redux';
import { FormattedMessage } from '@kbn/i18n-react';

import { selectPingHistogram } from '../../../state/selectors';
import { useUrlParams } from '../../../hooks';

export const TroubleshootPopover = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => setIsPopoverOpen((prevState) => !prevState);
  const closePopover = () => setIsPopoverOpen(false);

  const { pingHistogram } = useSelector(selectPingHistogram);

  const updatedUrlParams = useUrlParams()[1];

  const histogram = pingHistogram?.histogram ?? [];

  const middleBucketTimestamp = histogram?.[Math.floor(histogram.length / 2)].x;
  const firstBucketTimestamp = histogram?.[0].x;

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty iconType="arrowDown" iconSide="right" onClick={onButtonClick}>
          Troubleshoot
        </EuiButtonEmpty>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="upCenter"
    >
      <EuiPopoverTitle>Troubleshoot out of sync clock</EuiPopoverTitle>
      <div style={{ width: '300px' }}>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.uptime.monitorList.noMessage.troubleshoot"
              defaultMessage="If there is data in the pings over time chart and you dont see any monitors in monitor
            list. There might be an issue with your system clock, either on the system heartbeat is
            running or where kibana is running."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.uptime.monitorList.noMessage.troubleshoot.part"
              defaultMessage="You can try the absolute date range, if that shows missing monitors, then make sure to
            check out of sync system clock."
            />
          </p>
        </EuiText>
      </div>
      <EuiPopoverFooter>
        <EuiButton
          fullWidth
          size="s"
          onClick={() => {
            if (middleBucketTimestamp && firstBucketTimestamp) {
              updatedUrlParams({
                dateRangeStart: new Date(firstBucketTimestamp).toISOString(),
                dateRangeEnd: new Date(middleBucketTimestamp).toISOString(),
              });
            }
          }}
        >
          Try absolute date range
        </EuiButton>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
