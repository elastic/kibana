/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { LogEntryCategory } from '../../../../../../common/log_analysis';
import { TimeRange } from '../../../../../../common/time';
import { BetaBadge } from '../../../../../components/beta_badge';
import { LoadingOverlayWrapper } from '../../../../../components/loading_overlay_wrapper';
import { RecreateJobButton } from '../../../../../components/logging/log_analysis_setup/create_job_button';
import { AnalyzeInMlButton } from '../../../../../components/logging/log_analysis_results';
import { DatasetsSelector } from '../../../../../components/logging/log_analysis_results/datasets_selector';
import { TopCategoriesTable } from './top_categories_table';
import { SortOptions, ChangeSortOptions } from '../../use_log_entry_categories_results';

export const TopCategoriesSection: React.FunctionComponent<{
  availableDatasets: string[];
  hasSetupCapabilities: boolean;
  isLoadingDatasets?: boolean;
  isLoadingTopCategories?: boolean;
  jobId: string;
  onChangeDatasetSelection: (datasets: string[]) => void;
  onRequestRecreateMlJob: () => void;
  selectedDatasets: string[];
  sourceId: string;
  timeRange: TimeRange;
  topCategories: LogEntryCategory[];
  sortOptions: SortOptions;
  changeSortOptions: ChangeSortOptions;
}> = ({
  availableDatasets,
  hasSetupCapabilities,
  isLoadingDatasets = false,
  isLoadingTopCategories = false,
  jobId,
  onChangeDatasetSelection,
  onRequestRecreateMlJob,
  selectedDatasets,
  sourceId,
  timeRange,
  topCategories,
  sortOptions,
  changeSortOptions,
}) => {
  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="m" aria-label={title}>
            <h1>
              {title} <BetaBadge />
            </h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RecreateJobButton
            hasSetupCapabilities={hasSetupCapabilities}
            onClick={onRequestRecreateMlJob}
            size="s"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AnalyzeInMlButton jobId={jobId} timeRange={timeRange} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <DatasetsSelector
        availableDatasets={availableDatasets}
        isLoading={isLoadingDatasets}
        onChangeDatasetSelection={onChangeDatasetSelection}
        selectedDatasets={selectedDatasets}
      />
      <EuiSpacer />
      <LoadingOverlayWrapper
        isLoading={isLoadingTopCategories}
        loadingChildren={<LoadingOverlayContent />}
      >
        <TopCategoriesTable
          categorizationJobId={jobId}
          sourceId={sourceId}
          timeRange={timeRange}
          topCategories={topCategories}
          sortOptions={sortOptions}
          changeSortOptions={changeSortOptions}
        />
      </LoadingOverlayWrapper>
    </>
  );
};

const title = i18n.translate('xpack.infra.logs.logEntryCategories.topCategoriesSectionTitle', {
  defaultMessage: 'Log message categories',
});

const loadingAriaLabel = i18n.translate(
  'xpack.infra.logs.logEntryCategories.topCategoriesSectionLoadingAriaLabel',
  { defaultMessage: 'Loading message categories' }
);

const LoadingOverlayContent = () => <EuiLoadingSpinner size="xl" aria-label={loadingAriaLabel} />;
