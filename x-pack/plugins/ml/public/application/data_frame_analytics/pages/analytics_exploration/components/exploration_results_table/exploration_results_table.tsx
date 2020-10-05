/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';

import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';

import { SavedSearchQuery } from '../../../../../contexts/ml';
import { getToastNotifications } from '../../../../../util/dependency_cache';

import {
  DataFrameAnalyticsConfig,
  SEARCH_SIZE,
  defaultSearchQuery,
  getDefaultTrainingFilterQuery,
} from '../../../../common';
import { DATA_FRAME_TASK_STATE } from '../../../analytics_management/components/analytics_list/common';
import { ExplorationQueryBar } from '../exploration_query_bar';

import { useExplorationResults } from './use_exploration_results';
import { useMlKibana } from '../../../../../contexts/kibana';
import { useUrlState } from '../../../../../util/url_state';

import { ExpandableSectionResults } from '../expandable_section';

const showingDocs = i18n.translate(
  'xpack.ml.dataframe.analytics.explorationResults.documentsShownHelpText',
  {
    defaultMessage: 'Showing documents for which predictions exist',
  }
);

const showingFirstDocs = i18n.translate(
  'xpack.ml.dataframe.analytics.explorationResults.firstDocumentsShownHelpText',
  {
    defaultMessage: 'Showing first {searchSize} documents for which predictions exist',
    values: { searchSize: SEARCH_SIZE },
  }
);

const filters = {
  options: [
    {
      id: 'training',
      label: i18n.translate('xpack.ml.dataframe.analytics.explorationResults.trainingSubsetLabel', {
        defaultMessage: 'Training',
      }),
    },
    {
      id: 'testing',
      label: i18n.translate('xpack.ml.dataframe.analytics.explorationResults.testingSubsetLabel', {
        defaultMessage: 'Testing',
      }),
    },
  ],
  columnId: 'ml.is_training',
  key: { training: true, testing: false },
};

interface Props {
  indexPattern: IndexPattern;
  jobConfig: DataFrameAnalyticsConfig;
  jobStatus?: DATA_FRAME_TASK_STATE;
  needsDestIndexPattern: boolean;
  setEvaluateSearchQuery: React.Dispatch<React.SetStateAction<object>>;
  title: string;
  defaultIsTraining?: boolean;
}

export const ExplorationResultsTable: FC<Props> = React.memo(
  ({
    indexPattern,
    jobConfig,
    jobStatus,
    needsDestIndexPattern,
    setEvaluateSearchQuery,
    title,
    defaultIsTraining,
  }) => {
    const {
      services: {
        mlServices: { mlApiServices },
      },
    } = useMlKibana();
    const [globalState, setGlobalState] = useUrlState('_g');
    const [searchQuery, setSearchQuery] = useState<SavedSearchQuery>(defaultSearchQuery);
    const [defaultQueryString, setDefaultQueryString] = useState<string | undefined>();

    useEffect(() => {
      setEvaluateSearchQuery(searchQuery);
    }, [JSON.stringify(searchQuery)]);

    useEffect(() => {
      if (defaultIsTraining !== undefined) {
        // Apply defaultIsTraining filter
        setSearchQuery(
          getDefaultTrainingFilterQuery(jobConfig.dest.results_field, defaultIsTraining)
        );
        setDefaultQueryString(`${jobConfig.dest.results_field}.is_training : ${defaultIsTraining}`);
        // Clear defaultIsTraining from url
        setGlobalState('ml', {
          analysisType: globalState.ml.analysisType,
          jobId: globalState.ml.jobId,
        });
      }
    }, []);

    const classificationData = useExplorationResults(
      indexPattern,
      jobConfig,
      searchQuery,
      getToastNotifications(),
      mlApiServices
    );

    const { tableItems } = classificationData;

    if (jobConfig === undefined || classificationData === undefined) {
      return null;
    }

    return (
      <>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiSpacer size="s" />
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem>
                <ExplorationQueryBar
                  indexPattern={indexPattern}
                  setSearchQuery={setSearchQuery}
                  defaultQueryString={defaultQueryString}
                  filters={filters}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFormRow
              helpText={tableItems.length === SEARCH_SIZE ? showingFirstDocs : showingDocs}
            >
              <Fragment />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <ExpandableSectionResults
          indexData={classificationData}
          indexPattern={indexPattern}
          jobConfig={jobConfig}
          needsDestIndexPattern={needsDestIndexPattern}
          searchQuery={searchQuery}
        />
      </>
    );
  }
);
