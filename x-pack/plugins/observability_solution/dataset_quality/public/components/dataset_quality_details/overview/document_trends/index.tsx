/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
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
import { css } from '@emotion/react';
import { UnifiedBreakdownFieldSelector } from '@kbn/unified-histogram-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  discoverAriaText,
  logsExplorerAriaText,
  openInDiscoverText,
  openInLogsExplorerText,
  overviewTrendsDocsText,
} from '../../../../../common/translations';
import { TrendDocsChart } from './trend_docs_chart';
import { useDatasetQualityDetailsState, useQualityIssuesDocsChart } from '../../../../hooks';

const trendDocsTooltip = (
  <FormattedMessage
    id="xpack.datasetQuality.details.trendDocsTooltip"
    defaultMessage="The percentage of ignored fields or failed docs over the selected timeframe."
  />
);

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function DocumentTrends({ lastReloadTime }: { lastReloadTime: number }) {
  const { timeRange, updateTimeRange, docsTrendChart } = useDatasetQualityDetailsState();
  const {
    dataView,
    breakdown,
    redirectLinkProps,
    handleDocsTrendChartChange,
    ...qualityIssuesChartProps
  } = useQualityIssuesDocsChart();

  const accordionId = useGeneratedHtmlId({
    prefix: overviewTrendsDocsText,
  });

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
              data-test-subj="datasetQualityDetailsChartTypeButtonGroup"
              legend={i18n.translate('xpack.datasetQuality.details.chartTypeLegend', {
                defaultMessage: 'Quality chart type',
              })}
              onChange={(id) => handleDocsTrendChartChange(id)}
              options={[
                {
                  id: 'degraded',
                  label: i18n.translate('xpack.datasetQuality.details.chartType.degradedDocs', {
                    defaultMessage: 'Ignored fields',
                  }),
                },
                {
                  id: 'failed',
                  label: i18n.translate('xpack.datasetQuality.details.chartType.failedDocs', {
                    defaultMessage: 'Failed docs',
                  }),
                },
              ]}
              idSelected={docsTrendChart}
            />
          </EuiFlexItem>
          <EuiSkeletonRectangle width={160} height={32} isLoading={!dataView}>
            <UnifiedBreakdownFieldSelector
              dataView={dataView!}
              breakdown={{
                field:
                  breakdown.dataViewField && breakdown.fieldSupportsBreakdown
                    ? breakdown.dataViewField
                    : undefined,
              }}
              onBreakdownFieldChange={breakdown.onChange}
            />
          </EuiSkeletonRectangle>
          <EuiToolTip
            content={
              redirectLinkProps.isLogsExplorerAvailable
                ? openInLogsExplorerText
                : openInDiscoverText
            }
          >
            <EuiButtonIcon
              display="base"
              iconType={
                redirectLinkProps.isLogsExplorerAvailable ? 'logoObservability' : 'discoverApp'
              }
              aria-label={
                redirectLinkProps.isLogsExplorerAvailable ? logsExplorerAriaText : discoverAriaText
              }
              size="s"
              data-test-subj="datasetQualityDetailsLinkToDiscover"
              {...redirectLinkProps.linkProps}
            />
          </EuiToolTip>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <TrendDocsChart
          {...qualityIssuesChartProps}
          timeRange={timeRange}
          lastReloadTime={lastReloadTime}
          onTimeRangeChange={onTimeRangeChange}
        />
      </EuiAccordion>
    </EuiPanel>
  );
}
