/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiSuperDatePicker,
  OnRefreshProps,
  EuiToolTip,
  EuiIcon,
  EuiCode,
} from '@elastic/eui';
import { TimeRangeConfig } from '../../state_machines/dataset_quality_controller';
import { useDatasetQualityContext } from '../dataset_quality/context';
import { MalformedDocsTrend } from './malformed_docs_trend';

const DEFAULT_TIME_RANGE: TimeRangeConfig = {
  from: 'now-24h',
  to: 'now',
  refresh: { interval: 60_000, isPaused: false },
};

export function MalformedDocs({
  dataStream,
  timeRange = DEFAULT_TIME_RANGE,
}: {
  dataStream?: string;
  timeRange?: TimeRangeConfig;
}) {
  const { service } = useDatasetQualityContext();

  const [lastReloadTime, setLastReloadTime] = useState<number>(Date.now());

  const handleRefresh = useCallback((_refreshProps: OnRefreshProps) => {
    setLastReloadTime(Date.now());
  }, []);

  const handleTimeChange = useCallback(
    (durationRange) => {
      service.send({
        type: 'UPDATE_INSIGHTS_TIME_RANGE',
        timeRange: {
          from: durationRange.start,
          to: durationRange.end,
          refresh: DEFAULT_TIME_RANGE.refresh,
        },
      });
    },
    [service]
  );

  return (
    <EuiPanel hasBorder grow={false}>
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
            <EuiText>
              <FormattedMessage
                id="xpack.datasetQuality.flyout.malformedDocsTitle"
                defaultMessage="Malformed docs"
              />
            </EuiText>
          </EuiTitle>
          <EuiToolTip content={malformedDocsTooltip}>
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
            onTimeChange={handleTimeChange}
            onRefresh={handleRefresh}
            isQuickSelectOnly={false}
            showUpdateButton="iconOnly"
            updateButtonProps={{ fill: false }}
          />
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiSpacer />
      <MalformedDocsTrend
        dataStream={dataStream}
        timeRange={timeRange}
        lastReloadTime={lastReloadTime}
      />
    </EuiPanel>
  );
}

const malformedDocsTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.flyoutMalformedDocsTooltip"
    defaultMessage="The percentage of degraded documents —documents with the {ignoredProperty} property— in your dataset."
    values={{
      ignoredProperty: (
        <EuiCode language="json" transparentBackground>
          _ignored
        </EuiCode>
      ),
    }}
  />
);
