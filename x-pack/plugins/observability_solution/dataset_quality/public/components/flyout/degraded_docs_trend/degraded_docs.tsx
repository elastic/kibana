/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
  EuiIcon,
  EuiCode,
  OnTimeChangeProps,
  EuiSkeletonRectangle,
} from '@elastic/eui';
import { UnifiedBreakdownFieldSelector } from '@kbn/unified-histogram-plugin/public';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { useDegradedDocsChart } from '../../../hooks';

import { DEFAULT_TIME_RANGE, DEFAULT_DATEPICKER_REFRESH } from '../../../../common/constants';
import { flyoutDegradedDocsText } from '../../../../common/translations';
import { TimeRangeConfig } from '../../../state_machines/dataset_quality_controller';
import { DegradedDocsChart } from './degraded_docs_chart';

export function DegradedDocs({
  dataStream,
  timeRange = { ...DEFAULT_TIME_RANGE, refresh: DEFAULT_DATEPICKER_REFRESH },
  lastReloadTime,
  onTimeRangeChange,
}: {
  dataStream?: string;
  timeRange?: TimeRangeConfig;
  lastReloadTime: number;
  onTimeRangeChange: (props: Pick<OnTimeChangeProps, 'start' | 'end'>) => void;
}) {
  const { dataView, breakdown, ...chartProps } = useDegradedDocsChart({ dataStream });

  const [breakdownDataViewField, setBreakdownDataViewField] = useState<DataViewField | undefined>(
    undefined
  );

  useEffect(() => {
    if (breakdown.dataViewField && breakdown.fieldSupportsBreakdown) {
      setBreakdownDataViewField(breakdown.dataViewField);
    } else {
      setBreakdownDataViewField(undefined);
    }

    if (breakdown.dataViewField && !breakdown.fieldSupportsBreakdown) {
      // TODO: If needed, notify user that the field is not breakable
    }
  }, [setBreakdownDataViewField, breakdown.dataViewField, breakdown.fieldSupportsBreakdown]);

  return (
    <EuiPanel hasBorder grow={false}>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem
          css={css`
            flex-direction: row;
            justify-content: flex-start;
            align-items: flex-start;
            gap: 4px;
          `}
        >
          <EuiTitle size="xxxs">
            <h6>{flyoutDegradedDocsText}</h6>
          </EuiTitle>
          <EuiToolTip content={degradedDocsTooltip}>
            <EuiIcon size="m" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </EuiToolTip>
        </EuiFlexItem>

        <EuiSkeletonRectangle width={160} height={32} isLoading={!dataView}>
          <UnifiedBreakdownFieldSelector
            dataView={dataView!}
            breakdown={{ field: breakdownDataViewField }}
            onBreakdownFieldChange={breakdown.onChange}
          />
        </EuiSkeletonRectangle>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <DegradedDocsChart
        {...chartProps}
        timeRange={timeRange}
        lastReloadTime={lastReloadTime}
        onTimeRangeChange={onTimeRangeChange}
      />
    </EuiPanel>
  );
}

const degradedDocsTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.flyoutDegradedDocsTooltip"
    defaultMessage="The percentage of degraded documents —documents with the {ignoredProperty} property— in your data set."
    values={{
      ignoredProperty: (
        <EuiCode language="json" transparentBackground>
          _ignored
        </EuiCode>
      ),
    }}
  />
);
