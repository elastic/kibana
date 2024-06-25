/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiIcon,
  EuiSuperDatePicker,
  EuiTitle,
  EuiToolTip,
  OnRefreshProps,
  OnTimeChangeProps,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { flyoutSummaryText } from '../../../../common/translations';
import { TimeRangeConfig } from '../../../state_machines/dataset_quality_controller';

export function FlyoutSummaryHeader({
  timeRange,
  onTimeChange,
  onRefresh,
}: {
  timeRange: TimeRangeConfig;
  onTimeChange: (timeChangeProps: OnTimeChangeProps) => void;
  onRefresh: (refreshProps: OnRefreshProps) => void;
}) {
  return (
    <EuiFlexGroup alignItems="center" wrap={true}>
      <EuiFlexGroup
        css={css`
          flex-grow: 1;
        `}
        justifyContent="flexStart"
        alignItems="center"
        gutterSize="xs"
      >
        <EuiTitle size="s">
          <span>{flyoutSummaryText}</span>
        </EuiTitle>
        <EuiToolTip content={flyoutSummaryTooltip}>
          <EuiIcon size="m" color="subdued" type="questionInCircle" className="eui-alignTop" />
        </EuiToolTip>
      </EuiFlexGroup>

      <EuiFlexGroup
        css={css`
          flex-grow: 0;
        `}
      >
        <EuiSuperDatePicker
          width="auto"
          compressed={true}
          isLoading={false}
          start={timeRange.from}
          end={timeRange.to}
          onTimeChange={onTimeChange}
          onRefresh={onRefresh}
          isQuickSelectOnly={false}
          showUpdateButton="iconOnly"
          updateButtonProps={{ fill: false }}
        />
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}

const flyoutSummaryTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.flyoutSummaryTooltip"
    defaultMessage="Stats of the data set within the selected time range."
  />
);
