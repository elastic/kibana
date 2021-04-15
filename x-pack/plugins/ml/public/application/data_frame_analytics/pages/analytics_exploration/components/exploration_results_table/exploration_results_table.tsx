/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';

import { UseIndexDataReturnType } from '../../../../../components/data_grid';

import { DataFrameAnalyticsConfig } from '../../../../common';
import { ResultsSearchQuery } from '../../../../common/analytics';

import { DataFrameTaskStateType } from '../../../analytics_management/components/analytics_list/common';

import { ExpandableSectionResults } from '../expandable_section';

interface Props {
  indexPattern: IndexPattern;
  jobConfig: DataFrameAnalyticsConfig;
  jobStatus?: DataFrameTaskStateType;
  needsDestIndexPattern: boolean;
  resultsTableData: UseIndexDataReturnType;
  searchQuery: ResultsSearchQuery;
}

export const ExplorationResultsTable: FC<Props> = React.memo(
  ({ resultsTableData, indexPattern, jobConfig, needsDestIndexPattern, searchQuery }) => {
    if (jobConfig === undefined || resultsTableData === undefined) {
      return null;
    }

    return (
      <div data-test-subj="mlDFAnalyticsExplorationTablePanel">
        <ExpandableSectionResults
          indexData={resultsTableData}
          indexPattern={indexPattern}
          jobConfig={jobConfig}
          needsDestIndexPattern={needsDestIndexPattern}
          searchQuery={searchQuery}
        />
      </div>
    );
  }
);
