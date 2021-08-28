/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React from 'react';
import { IndexPattern } from '../../../../../../../../../../src/plugins/data/common/index_patterns/index_patterns/index_pattern';
import type {
  DataFrameAnalyticsConfig,
  DataFrameTaskStateType,
} from '../../../../../../../common/types/data_frame_analytics';
import { useMlKibana } from '../../../../../contexts/kibana/kibana_context';
import { getToastNotifications } from '../../../../../util/dependency_cache';
import type { ResultsSearchQuery } from '../../../../common/analytics';
import { ExpandableSectionResults } from '../expandable_section/expandable_section_results';
import { useExplorationResults } from './use_exploration_results';

interface Props {
  indexPattern: IndexPattern;
  jobConfig: DataFrameAnalyticsConfig;
  jobStatus?: DataFrameTaskStateType;
  needsDestIndexPattern: boolean;
  searchQuery: ResultsSearchQuery;
}

export const ExplorationResultsTable: FC<Props> = React.memo(
  ({ indexPattern, jobConfig, needsDestIndexPattern, searchQuery }) => {
    const {
      services: {
        mlServices: { mlApiServices },
      },
    } = useMlKibana();

    const classificationData = useExplorationResults(
      indexPattern,
      jobConfig,
      searchQuery,
      getToastNotifications(),
      mlApiServices
    );

    if (jobConfig === undefined || classificationData === undefined) {
      return null;
    }

    return (
      <div data-test-subj="mlDFAnalyticsExplorationTablePanel">
        <ExpandableSectionResults
          indexData={classificationData}
          indexPattern={indexPattern}
          jobConfig={jobConfig}
          needsDestIndexPattern={needsDestIndexPattern}
          searchQuery={searchQuery}
        />
      </div>
    );
  }
);
