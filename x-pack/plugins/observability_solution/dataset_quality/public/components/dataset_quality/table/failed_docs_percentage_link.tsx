/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiLink, EuiSkeletonRectangle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FAILURE_STORE_SELECTOR } from '../../../../common/constants';
import { DataStreamStat } from '../../../../common/data_streams_stats/data_stream_stat';
import { TimeRangeConfig } from '../../../../common/types';
import { useDatasetRedirectLinkTelemetry, useRedirectLink } from '../../../hooks';
import { QualityPercentageIndicator } from '../../quality_indicator';

export const FailedDocsPercentageLink = ({
  isLoading,
  dataStreamStat,
  timeRange,
}: {
  isLoading: boolean;
  dataStreamStat: DataStreamStat;
  timeRange: TimeRangeConfig;
}) => {
  const {
    failedDocs: { percentage, count },
  } = dataStreamStat;

  const { sendTelemetry } = useDatasetRedirectLinkTelemetry({
    rawName: dataStreamStat.rawName,
    query: { language: 'kuery', query: '' },
  });

  const redirectLinkProps = useRedirectLink({
    dataStreamStat,
    query: { language: 'kuery', query: '' },
    sendTelemetry,
    timeRangeConfig: timeRange,
    selector: FAILURE_STORE_SELECTOR,
  });

  const tooltip = (failedDocsCount: number) =>
    i18n.translate('xpack.datasetQuality.fewFailedDocsTooltip', {
      defaultMessage: '{failedDocsCount} failed docs in this data set.',
      values: {
        failedDocsCount,
      },
    });

  return (
    <EuiSkeletonRectangle width="50px" height="20px" borderRadius="m" isLoading={isLoading}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        {percentage ? (
          <EuiLink
            data-test-subj="datasetQualityFailedDocsPercentageLink"
            {...redirectLinkProps.linkProps}
          >
            <QualityPercentageIndicator
              percentage={percentage}
              docsCount={count}
              tooltipContent={tooltip}
            />
          </EuiLink>
        ) : (
          <QualityPercentageIndicator
            percentage={percentage}
            docsCount={count}
            tooltipContent={tooltip}
          />
        )}
      </EuiFlexGroup>
    </EuiSkeletonRectangle>
  );
};
