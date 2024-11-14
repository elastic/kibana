/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiAccordion,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
  OnTimeChangeProps,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { css } from '@emotion/react';
import { UnifiedBreakdownFieldSelector } from '@kbn/unified-histogram-plugin/public';
import { useFailedDocsChart } from '../../../../../hooks/use_failed_docs_chart';
import {
  discoverAriaText,
  logsExplorerAriaText,
  openInDiscoverText,
  openInLogsExplorerText,
  overviewTrendsDocsText,
} from '../../../../../../common/translations';
import { DegradedDocsChart } from './degraded_docs_chart';
import {
  useDatasetDetailsRedirectLinkTelemetry,
  useDatasetQualityDetailsState,
  useDegradedDocsChart,
  useRedirectLink,
} from '../../../../../hooks';
import { _IGNORED } from '../../../../../../common/es_fields';
import { NavigationSource } from '../../../../../services/telemetry';

const trendDocsTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.details.trendDocsTooltip"
    defaultMessage="The percentage of ignored fields or failed docs over the selected timeframe."
  />
);

const DEGRADED_DOCS_KUERY = `${_IGNORED}: *`;

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function DegradedDocs({ lastReloadTime }: { lastReloadTime: number }) {
  const { timeRange, updateTimeRange, datasetDetails } = useDatasetQualityDetailsState();
  const {
    dataView: degradedDataView,
    breakdown: degradedBreakdown,
    ...degradeChartProps
  } = useDegradedDocsChart();
  const {
    dataView: failedDataView,
    breakdown: failedBreakDown,
    ...failedChartProps
  } = useFailedDocsChart();

  const accordionId = useGeneratedHtmlId({
    prefix: overviewTrendsDocsText,
  });

  const [breakdownDataViewField, setBreakdownDataViewField] = useState<DataViewField | undefined>(
    undefined
  );

  const [selectedChart, setSelectedChart] = useState('degradedDocs');

  const { sendTelemetry } = useDatasetDetailsRedirectLinkTelemetry({
    query: { language: 'kuery', query: DEGRADED_DOCS_KUERY },
    navigationSource: NavigationSource.Trend,
  });

  const degradedDocLinkLogsExplorer = useRedirectLink({
    dataStreamStat: datasetDetails,
    timeRangeConfig: timeRange,
    query: {
      language: 'kuery',
      query: selectedChart === 'degradedDocs' ? DEGRADED_DOCS_KUERY : '',
    },
    sendTelemetry,
  });

  useEffect(() => {
    if (degradedBreakdown.dataViewField && degradedBreakdown.fieldSupportsBreakdown) {
      setBreakdownDataViewField(degradedBreakdown.dataViewField);
    } else {
      setBreakdownDataViewField(undefined);
    }
  }, [setBreakdownDataViewField, degradedBreakdown]);

  const onTimeRangeChange = useCallback(
    ({ start, end }: Pick<OnTimeChangeProps, 'start' | 'end'>) => {
      updateTimeRange({ start, end, refreshInterval: timeRange.refresh.value });
    },
    [updateTimeRange, timeRange.refresh]
  );

  const accordionTitle = (
    <EuiFlexItem
      css={css`
        flex-direction: row;
        justify-content: flex-start;
        align-items: flex-start;
        gap: 4px;
      `}
    >
      <EuiTitle size={'xxs'}>
        <h5>{overviewTrendsDocsText}</h5>
      </EuiTitle>
      <EuiToolTip content={trendDocsTooltip}>
        <EuiIcon size="m" color="subdued" type="questionInCircle" className="eui-alignTop" />
      </EuiToolTip>
    </EuiFlexItem>
  );

  return (
    <EuiPanel hasBorder grow={false}>
      <EuiAccordion
        id={accordionId}
        buttonContent={accordionTitle}
        paddingSize="none"
        initialIsOpen={true}
        data-test-subj="datasetQualityDetailsOverviewDocumentTrends"
      >
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem>
            <EuiButtonGroup
              legend="Legend is required"
              onChange={setSelectedChart}
              options={[
                { id: 'degradedDocs', label: 'Ignored fields' },
                { id: 'failedDocs', label: 'Failed docs' },
              ]}
              idSelected={selectedChart}
            />
          </EuiFlexItem>
          {selectedChart === 'degradedDocs' ? (
            <EuiSkeletonRectangle width={160} height={32} isLoading={!degradedDataView}>
              <UnifiedBreakdownFieldSelector
                dataView={degradedDataView!}
                breakdown={{ field: breakdownDataViewField }}
                onBreakdownFieldChange={degradedBreakdown.onChange}
              />
            </EuiSkeletonRectangle>
          ) : (
            <></>
          )}
          <EuiToolTip
            content={
              degradedDocLinkLogsExplorer.isLogsExplorerAvailable
                ? openInLogsExplorerText
                : openInDiscoverText
            }
          >
            <EuiButtonIcon
              display="base"
              iconType={
                degradedDocLinkLogsExplorer.isLogsExplorerAvailable
                  ? 'logoObservability'
                  : 'discoverApp'
              }
              aria-label={
                degradedDocLinkLogsExplorer.isLogsExplorerAvailable
                  ? logsExplorerAriaText
                  : discoverAriaText
              }
              size="s"
              data-test-subj="datasetQualityDetailsLinkToDiscover"
              {...degradedDocLinkLogsExplorer.linkProps}
            />
          </EuiToolTip>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {selectedChart === 'degradedDocs' ? (
          <DegradedDocsChart
            {...degradeChartProps}
            timeRange={timeRange}
            lastReloadTime={lastReloadTime}
            onTimeRangeChange={onTimeRangeChange}
          />
        ) : (
          <DegradedDocsChart
            {...failedChartProps}
            timeRange={timeRange}
            lastReloadTime={lastReloadTime}
            onTimeRangeChange={onTimeRangeChange}
          />
        )}
      </EuiAccordion>
    </EuiPanel>
  );
}
