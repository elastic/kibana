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
import { useDatePickerContext } from '../hooks/use_date_picker';

export const MetricNotAvailableExplanationTooltip = ({ metricName }: { metricName: string }) => {
  const { getDateRangeInTimestamp } = useDatePickerContext();
  const dateFromRange = new Date(getDateRangeInTimestamp().to);

  return (
    <Popover
      iconSize="s"
      iconColor="subdued"
      icon="questionInCircle"
      data-test-subj="infraAssetDetailsMetricNotAvailablePopoverButton"
    >
      <EuiText size="xs" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.infra.assetDetails.processes.tooltip.metricNotAvailableTitle"
            defaultMessage="No {metric} value detected for the 1 minute preceding {date} @ {time}."
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
              metric: metricName,
            }}
          />
        </p>
        <p>
          <FormattedMessage
            id="xpack.infra.assetDetails.processes.tooltip.metricNotAvailableActionText"
            defaultMessage="Try changing the selected time period or check the data collection method for this host."
          />
        </p>
      </EuiText>
    </Popover>
  );
};
