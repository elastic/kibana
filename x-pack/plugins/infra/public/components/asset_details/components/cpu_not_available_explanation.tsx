/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedDate, FormattedMessage, FormattedTime } from '@kbn/i18n-react';
import { Popover } from '../tabs/common/popover';
import { useDateRangeProviderContext } from '../hooks/use_date_range';

export const CpuNotAvailableExplanationTooltip = () => {
  const { getDateRangeInTimestamp } = useDateRangeProviderContext();
  const dateFromRange = new Date(getDateRangeInTimestamp().to);

  return (
    <Popover
      iconSize="s"
      iconColor="subdued"
      icon="questionInCircle"
      data-test-subj="infraAssetDetailsCpuNotAvailablePopoverButton"
    >
      <EuiText size="xs" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.infra.assetDetails.processes.tooltip.cpuNotAvailableTitle"
            defaultMessage="No CPU value detected for the 1 minute preceding {date} @ {time}."
            values={{
              date: (
                <FormattedDate value={dateFromRange} month="short" day="numeric" year="numeric" />
              ),
              time: (
                <FormattedTime
                  value={dateFromRange}
                  hour12={false}
                  hour="2-digit"
                  minute="2-digit"
                  second="2-digit"
                />
              ),
            }}
          />
        </p>
        <p>
          <FormattedMessage
            id="xpack.infra.assetDetails.processes.tooltip.cpuNotAvailableActionText"
            defaultMessage="Try changing the selected time period or check the data collection method for this host."
          />
        </p>
      </EuiText>
    </Popover>
  );
};
