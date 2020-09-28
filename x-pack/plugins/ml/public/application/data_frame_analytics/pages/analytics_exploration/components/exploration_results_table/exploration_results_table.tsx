/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';

import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';

import { DataGrid } from '../../../../../components/data_grid';
import { SavedSearchQuery } from '../../../../../contexts/ml';
import { getToastNotifications } from '../../../../../util/dependency_cache';

import {
  DataFrameAnalyticsConfig,
  MAX_COLUMNS,
  SEARCH_SIZE,
  defaultSearchQuery,
  getAnalysisType,
} from '../../../../common';
import { getTaskStateBadge } from '../../../analytics_management/components/analytics_list/use_columns';
import { DATA_FRAME_TASK_STATE } from '../../../analytics_management/components/analytics_list/common';
import { ExplorationTitle } from '../exploration_title';
import { ExplorationQueryBar } from '../exploration_query_bar';
import { IndexPatternPrompt } from '../index_pattern_prompt';

import { useExplorationResults } from './use_exploration_results';
import { useMlKibana } from '../../../../../contexts/kibana';
import { DataFrameAnalysisConfigType } from '../../../../../../../common/types/data_frame_analytics';

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

interface Props {
  indexPattern: IndexPattern;
  jobConfig: DataFrameAnalyticsConfig;
  jobStatus?: DATA_FRAME_TASK_STATE;
  needsDestIndexPattern: boolean;
  setEvaluateSearchQuery: React.Dispatch<React.SetStateAction<object>>;
  title: string;
}

export const ExplorationResultsTable: FC<Props> = React.memo(
  ({
    indexPattern,
    jobConfig,
    jobStatus,
    needsDestIndexPattern,
    setEvaluateSearchQuery,
    title,
  }) => {
    const {
      services: {
        mlServices: { mlApiServices },
      },
    } = useMlKibana();
    const [searchQuery, setSearchQuery] = useState<SavedSearchQuery>(defaultSearchQuery);

    useEffect(() => {
      setEvaluateSearchQuery(searchQuery);
    }, [JSON.stringify(searchQuery)]);

    const analysisType = getAnalysisType(jobConfig.analysis);

    const classificationData = useExplorationResults(
      indexPattern,
      jobConfig,
      searchQuery,
      getToastNotifications(),
      mlApiServices
    );

    const docFieldsCount = classificationData.columnsWithCharts.length;
    const { columnsWithCharts, tableItems, visibleColumns } = classificationData;

    if (jobConfig === undefined || classificationData === undefined) {
      return null;
    }

    return (
      <EuiPanel
        grow={false}
        id="mlDataFrameAnalyticsTableResultsPanel"
        data-test-subj="mlDFAnalyticsExplorationTablePanel"
      >
        {needsDestIndexPattern && <IndexPatternPrompt destIndex={jobConfig.dest.index} />}
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <ExplorationTitle title={title} />
              </EuiFlexItem>
              {jobStatus !== undefined && (
                <EuiFlexItem grow={false}>
                  <span>{getTaskStateBadge(jobStatus)}</span>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem style={{ textAlign: 'right' }}>
                {docFieldsCount > MAX_COLUMNS && (
                  <EuiText size="s">
                    {i18n.translate(
                      'xpack.ml.dataframe.analytics.explorationResults.fieldSelection',
                      {
                        defaultMessage:
                          '{selectedFieldsLength, number} of {docFieldsCount, number} {docFieldsCount, plural, one {field} other {fields}} selected',
                        values: { selectedFieldsLength: visibleColumns.length, docFieldsCount },
                      }
                    )}
                  </EuiText>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        {(columnsWithCharts.length > 0 || searchQuery !== defaultSearchQuery) && (
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <EuiSpacer size="s" />
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem>
                  <ExplorationQueryBar
                    indexPattern={indexPattern}
                    setSearchQuery={setSearchQuery}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFormRow
                helpText={tableItems.length === SEARCH_SIZE ? showingFirstDocs : showingDocs}
              >
                <Fragment />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <DataGrid
                {...classificationData}
                dataTestSubj="mlExplorationDataGrid"
                toastNotifications={getToastNotifications()}
                analysisType={(analysisType as unknown) as DataFrameAnalysisConfigType}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiPanel>
    );
  }
);
