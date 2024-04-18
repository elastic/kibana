/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
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
  EuiSkeletonRectangle,
} from '@elastic/eui';
import {
  UnifiedBreakdownFieldSelector,
  fieldSupportsBreakdown,
} from '@kbn/unified-histogram-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';

import { useCreateDataView } from '../../../hooks';
import { indexNameToDataStreamParts } from '../../../../common/utils';
import { DEFAULT_LOGS_DATA_VIEW, DEFAULT_TIME_RANGE } from '../../../../common/constants';
import { flyoutDegradedDocsText } from '../../../../common/translations';
import { TimeRangeConfig } from '../../../state_machines/dataset_quality_controller';
import { useDatasetQualityContext } from '../../dataset_quality/context';
import { DegradedDocsChart } from './degraded_docs_chart';

const DEFAULT_REFRESH = { value: 60000, pause: false };

export function DegradedDocs({
  dataStream,
  timeRange = { ...DEFAULT_TIME_RANGE, refresh: DEFAULT_REFRESH },
  breakdownField,
}: {
  dataStream?: string;
  timeRange?: TimeRangeConfig;
  breakdownField?: string;
}) {
  const { service } = useDatasetQualityContext();
  const { dataView } = useCreateDataView({
    indexPatternString: getDataViewIndexPattern(dataStream),
  });

  const [breakdownDataViewField, setBreakdownDataViewField] = useState<DataViewField | undefined>(
    undefined
  );
  const [lastReloadTime, setLastReloadTime] = useState<number>(Date.now());

  useEffect(() => {
    if (dataView) {
      const dataViewField = getDataViewField(dataView, breakdownField);
      if (dataViewField) {
        const isFieldBreakable = fieldSupportsBreakdown(dataViewField);
        if (isFieldBreakable) {
          setBreakdownDataViewField(dataViewField);
        } else {
          setBreakdownDataViewField(undefined);
          // TODO: If needed, notify user that the field is not breakable
        }
      } else {
        setBreakdownDataViewField(undefined);
      }
    }
  }, [dataView, breakdownField]);

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

  const handleBreakdownFieldChange = useCallback(
    (field: DataViewField | undefined) => {
      service.send({
        type: 'BREAKDOWN_FIELD_CHANGE',
        breakdownField: field?.name ?? null,
      });
    },
    [service]
  );

  return (
    <EuiPanel hasBorder grow={false}>
      <EuiFlexGroup direction="column" justifyContent="center">
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
            flex-wrap: wrap-reverse;
          `}
          alignItems="center"
          justifyContent="spaceBetween"
        >
          {dataView ? (
            <UnifiedBreakdownFieldSelector
              dataView={dataView}
              breakdown={{ field: breakdownDataViewField }}
              onBreakdownFieldChange={handleBreakdownFieldChange}
            />
          ) : (
            <EuiSkeletonRectangle width={160} height={32} />
          )}

          <EuiFlexGroup
            css={css`
              flex-grow: 0;
              margin-left: auto;
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
      </EuiFlexGroup>
      <EuiSpacer />
      <DegradedDocsChart
        dataStream={dataStream}
        timeRange={timeRange}
        lastReloadTime={lastReloadTime}
        dataView={dataView}
        breakdownDataViewField={breakdownDataViewField}
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

function getDataViewIndexPattern(dataStream: string | undefined) {
  return dataStream ? `${indexNameToDataStreamParts(dataStream).type}-*-*` : DEFAULT_LOGS_DATA_VIEW;
}

function getDataViewField(dataView: DataView | undefined, fieldName: string | undefined) {
  return fieldName && dataView
    ? dataView.fields.find((field) => field.name === fieldName)
    : undefined;
}
