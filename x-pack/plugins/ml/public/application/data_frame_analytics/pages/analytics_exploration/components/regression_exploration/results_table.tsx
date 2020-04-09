/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';

import { i18n } from '@kbn/i18n';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import {
  BASIC_NUMERICAL_TYPES,
  EXTENDED_NUMERICAL_TYPES,
  sortRegressionResultsFields,
} from '../../../../common/fields';

import {
  DataFrameAnalyticsConfig,
  MAX_COLUMNS,
  INDEX_STATUS,
  SEARCH_SIZE,
  defaultSearchQuery,
} from '../../../../common';
import { getTaskStateBadge } from '../../../analytics_management/components/analytics_list/columns';
import { DATA_FRAME_TASK_STATE } from '../../../analytics_management/components/analytics_list/common';
import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';

import { useExploreData } from './use_explore_data';
import { ExplorationTitle } from './regression_exploration';
import { RegressionExplorationDataGrid } from './regression_exploration_data_grid';

const showingDocs = i18n.translate(
  'xpack.ml.dataframe.analytics.regressionExploration.documentsShownHelpText',
  {
    defaultMessage: 'Showing documents for which predictions exist',
  }
);

const showingFirstDocs = i18n.translate(
  'xpack.ml.dataframe.analytics.regressionExploration.firstDocumentsShownHelpText',
  {
    defaultMessage: 'Showing first {searchSize} documents for which predictions exist',
    values: { searchSize: SEARCH_SIZE },
  }
);

interface Props {
  indexPattern: IndexPattern;
  jobConfig: DataFrameAnalyticsConfig;
  jobStatus?: DATA_FRAME_TASK_STATE;
  setEvaluateSearchQuery: React.Dispatch<React.SetStateAction<object>>;
}

export const ResultsTable: FC<Props> = React.memo(
  ({ indexPattern, jobConfig, jobStatus, setEvaluateSearchQuery }) => {
    const needsDestIndexFields = indexPattern && indexPattern.title === jobConfig.source.index[0];

    const {
      errorMessage,
      fieldTypes,
      pagination,
      searchQuery,
      selectedFields,
      rowCount,
      setPagination,
      setSearchQuery,
      setSelectedFields,
      setSortingColumns,
      sortingColumns,
      status,
      tableFields,
      tableItems,
    } = useExploreData(jobConfig, needsDestIndexFields);

    const columns = tableFields
      .sort((a: any, b: any) => sortRegressionResultsFields(a, b, jobConfig))
      .map((field: any) => {
        // Built-in values are ['boolean', 'currency', 'datetime', 'numeric', 'json']
        // To fall back to the default string schema it needs to be undefined.
        let schema;
        const type = fieldTypes[field];
        const isNumber =
          type !== undefined &&
          (BASIC_NUMERICAL_TYPES.has(type) || EXTENDED_NUMERICAL_TYPES.has(type));

        if (isNumber) {
          schema = 'numeric';
        }

        switch (type) {
          case 'date':
            schema = 'datetime';
            break;
          case 'geo_point':
            schema = 'json';
            break;
        }

        return { id: field, schema };
      });

    const docFieldsCount = tableFields.length;

    // useEffect(() => {
    //   if (
    //     jobConfig !== undefined &&
    //     columns.length > 0 &&
    //     selectedFields.length > 0 &&
    //     sortField !== undefined &&
    //     sortDirection !== undefined &&
    //     selectedFields.some(field => field === sortField)
    //   ) {
    //     let field = sortField;
    //     // If sorting by predictedField use dependentVar type
    //     if (predictedFieldName === sortField) {
    //       field = dependentVariable;
    //     }
    //     const requiresKeyword = isKeywordAndTextType(field);

    //     loadExploreData({
    //       field: sortField,
    //       direction: sortDirection,
    //       searchQuery,
    //       requiresKeyword,
    //     });
    //   }
    // }, [JSON.stringify(searchQuery)]);

    if (jobConfig === undefined) {
      return null;
    }
    // if it's a searchBar syntax error leave the table visible so they can try again
    if (status === INDEX_STATUS.ERROR && !errorMessage.includes('parsing_exception')) {
      return (
        <EuiPanel grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <ExplorationTitle jobId={jobConfig.id} />
            </EuiFlexItem>
            {jobStatus !== undefined && (
              <EuiFlexItem grow={false}>
                <span>{getTaskStateBadge(jobStatus)}</span>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiCallOut
            title={i18n.translate('xpack.ml.dataframe.analytics.regressionExploration.indexError', {
              defaultMessage: 'An error occurred loading the index data.',
            })}
            color="danger"
            iconType="cross"
          >
            <p>{errorMessage}</p>
          </EuiCallOut>
        </EuiPanel>
      );
    }

    // const tableError =
    //   status === INDEX_STATUS.ERROR && errorMessage.includes('parsing_exception')
    //     ? errorMessage
    //     : searchError;

    return (
      <EuiPanel grow={false} data-test-subj="mlDFAnalyticsRegressionExplorationTablePanel">
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <ExplorationTitle jobId={jobConfig.id} />
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
                      'xpack.ml.dataframe.analytics.regressionExploration.fieldSelection',
                      {
                        defaultMessage:
                          '{selectedFieldsLength, number} of {docFieldsCount, number} {docFieldsCount, plural, one {field} other {fields}} selected',
                        values: { selectedFieldsLength: selectedFields.length, docFieldsCount },
                      }
                    )}
                  </EuiText>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        {status === INDEX_STATUS.LOADING && <EuiProgress size="xs" color="accent" />}
        {status !== INDEX_STATUS.LOADING && (
          <EuiProgress size="xs" color="accent" max={1} value={0} />
        )}
        {(columns.length > 0 || searchQuery !== defaultSearchQuery) && (
          <Fragment>
            <EuiFormRow
              helpText={tableItems.length === SEARCH_SIZE ? showingFirstDocs : showingDocs}
            >
              <Fragment />
            </EuiFormRow>

            <EuiSpacer />
            <RegressionExplorationDataGrid
              columns={columns}
              indexPattern={indexPattern}
              pagination={pagination}
              resultsField={jobConfig.dest.results_field}
              rowCount={rowCount}
              selectedFields={selectedFields}
              setPagination={setPagination}
              setSelectedFields={setSelectedFields}
              setSortingColumns={setSortingColumns}
              sortingColumns={sortingColumns}
              tableItems={tableItems}
            />
          </Fragment>
        )}
      </EuiPanel>
    );
  }
);
