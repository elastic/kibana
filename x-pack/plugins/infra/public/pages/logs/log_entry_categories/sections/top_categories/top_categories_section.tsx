/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { LogEntryCategory } from '../../../../../../common/log_analysis';
import { TimeRange } from '../../../../../../common/time';
import { LoadingOverlayWrapper } from '../../../../../components/loading_overlay_wrapper';
import { TopCategoriesTable } from './top_categories_table';
import { SortOptions, ChangeSortOptions } from '../../use_log_entry_categories_results';

export const TopCategoriesSection: React.FunctionComponent<{
  isLoadingTopCategories?: boolean;
  jobId: string;
  sourceId: string;
  timeRange: TimeRange;
  topCategories: LogEntryCategory[];
  sortOptions: SortOptions;
  changeSortOptions: ChangeSortOptions;
}> = ({
  isLoadingTopCategories = false,
  jobId,
  sourceId,
  timeRange,
  topCategories,
  sortOptions,
  changeSortOptions,
}) => {
  return (
    <>
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

const loadingAriaLabel = i18n.translate(
  'xpack.infra.logs.logEntryCategories.topCategoriesSectionLoadingAriaLabel',
  { defaultMessage: 'Loading message categories' }
);

const LoadingOverlayContent = () => <EuiLoadingSpinner size="xl" aria-label={loadingAriaLabel} />;
