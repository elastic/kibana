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

import { DEFAULT_TIME_RANGE } from '../../../../common/constants';
import { flyoutDegradedDocsText } from '../../../../common/translations';
import { TimeRangeConfig } from '../../../state_machines/dataset_quality_controller';
import { useDatasetQualityContext } from '../../dataset_quality/context';
import { DegradedDocsChart } from './degraded_docs_chart';

const DEFAULT_REFRESH = { value: 60000, pause: false };

export function DegradedDocs({
  dataStream,
  timeRange = { ...DEFAULT_TIME_RANGE, refresh: DEFAULT_REFRESH },
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
          refresh: timeRange.refresh ?? DEFAULT_REFRESH,
        },
      });
    },
    [service, timeRange.refresh]
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
            <EuiText>{flyoutDegradedDocsText}</EuiText>
          </EuiTitle>
          <EuiToolTip content={degradedDocsTooltip}>
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
      <DegradedDocsChart
        dataStream={dataStream}
        timeRange={timeRange}
        lastReloadTime={lastReloadTime}
      />
    </EuiPanel>
  );
}

const degradedDocsTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.flyoutDegradedDocsTooltip"
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
