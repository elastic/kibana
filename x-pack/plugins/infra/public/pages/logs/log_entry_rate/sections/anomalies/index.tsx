/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';

import { LogEntryRateResults } from '../../use_log_entry_rate_results';
import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import { AnomaliesTable } from './table';
import { RecreateJobButton } from '../../../../../components/logging/log_analysis_job_status';
import { AnalyzeInMlButton } from '../../../../../components/logging/log_analysis_results';
import { LoadingOverlayWrapper } from '../../../../../components/loading_overlay_wrapper';

export const AnomaliesResults: React.FunctionComponent<{
  isLoading: boolean;
  results: LogEntryRateResults | null;
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange;
  viewSetupForReconfiguration: () => void;
  jobId: string;
}> = ({ isLoading, results, setTimeRange, timeRange, viewSetupForReconfiguration, jobId }) => {
  const hasAnomalies = useMemo(() => {
    return results && results.histogramBuckets
      ? results.histogramBuckets.some((bucket) => {
          return bucket.partitions.some((partition) => {
            return partition.anomalies.length > 0;
          });
        })
      : false;
  }, [results]);

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="s" aria-label={title}>
            <h2>{title}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RecreateJobButton onClick={viewSetupForReconfiguration} size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AnalyzeInMlButton jobId={jobId} timeRange={timeRange} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <LoadingOverlayWrapper isLoading={isLoading} loadingChildren={<LoadingOverlayContent />}>
        {!results || (results && results.histogramBuckets && !results.histogramBuckets.length) ? (
          <EuiEmptyPrompt
            title={
              <h2>
                {i18n.translate('xpack.infra.logs.analysis.anomalySectionNoDataTitle', {
                  defaultMessage: 'There is no data to display.',
                })}
              </h2>
            }
            titleSize="m"
            body={
              <p>
                {i18n.translate('xpack.infra.logs.analysis.anomalySectionNoDataBody', {
                  defaultMessage: 'You may want to adjust your time range.',
                })}
              </p>
            }
          />
        ) : !hasAnomalies ? (
          <EuiEmptyPrompt
            title={
              <h2>
                {i18n.translate('xpack.infra.logs.analysis.anomalySectionNoAnomaliesTitle', {
                  defaultMessage: 'No anomalies were detected.',
                })}
              </h2>
            }
            titleSize="m"
          />
        ) : (
          <>
            <AnomaliesTable
              results={results}
              setTimeRange={setTimeRange}
              timeRange={timeRange}
              jobId={jobId}
            />
          </>
        )}
      </LoadingOverlayWrapper>
    </>
  );
};

const title = i18n.translate('xpack.infra.logs.analysis.anomaliesSectionTitle', {
  defaultMessage: 'Anomalies',
});

const loadingAriaLabel = i18n.translate(
  'xpack.infra.logs.analysis.anomaliesSectionLoadingAriaLabel',
  { defaultMessage: 'Loading anomalies' }
);

const LoadingOverlayContent = () => <EuiLoadingSpinner size="xl" aria-label={loadingAriaLabel} />;
