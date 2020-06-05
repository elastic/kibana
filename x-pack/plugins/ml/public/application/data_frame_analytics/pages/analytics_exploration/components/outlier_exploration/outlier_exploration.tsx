/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import {
  useColorRange,
  ColorRangeLegend,
  COLOR_RANGE,
  COLOR_RANGE_SCALE,
} from '../../../../../components/color_range_legend';

import { sortColumns, INDEX_STATUS, defaultSearchQuery } from '../../../../common';

import { getTaskStateBadge } from '../../../analytics_management/components/analytics_list/columns';

import { useExploreData, TableItem } from '../../hooks/use_explore_data';

import { ExplorationDataGrid } from '../exploration_data_grid';
import { ExplorationQueryBar } from '../exploration_query_bar';

const FEATURE_INFLUENCE = 'feature_influence';

const ExplorationTitle: FC<{ jobId: string }> = ({ jobId }) => (
  <EuiTitle size="xs">
    <span>
      {i18n.translate('xpack.ml.dataframe.analytics.exploration.jobIdTitle', {
        defaultMessage: 'Outlier detection job ID {jobId}',
        values: { jobId },
      })}
    </span>
  </EuiTitle>
);

interface ExplorationProps {
  jobId: string;
}

const getFeatureCount = (resultsField: string, tableItems: TableItem[] = []) => {
  if (tableItems.length === 0) {
    return 0;
  }

  return Object.keys(tableItems[0]).filter((key) =>
    key.includes(`${resultsField}.${FEATURE_INFLUENCE}.`)
  ).length;
};

export const OutlierExploration: FC<ExplorationProps> = React.memo(({ jobId }) => {
  const {
    errorMessage,
    indexPattern,
    jobConfig,
    jobStatus,
    pagination,
    searchQuery,
    selectedFields,
    setPagination,
    setSearchQuery,
    setSelectedFields,
    setSortingColumns,
    sortingColumns,
    rowCount,
    status,
    tableFields,
    tableItems,
  } = useExploreData(jobId);

  const columns = [];

  if (
    jobConfig !== undefined &&
    indexPattern !== undefined &&
    selectedFields.length > 0 &&
    tableItems.length > 0
  ) {
    const resultsField = jobConfig.dest.results_field;
    const removePrefix = new RegExp(`^${resultsField}\.${FEATURE_INFLUENCE}\.`, 'g');
    columns.push(
      ...tableFields.sort(sortColumns(tableItems[0], resultsField)).map((id) => {
        const idWithoutPrefix = id.replace(removePrefix, '');
        const field = indexPattern.fields.getByName(idWithoutPrefix);

        // Built-in values are ['boolean', 'currency', 'datetime', 'numeric', 'json']
        // To fall back to the default string schema it needs to be undefined.
        let schema;

        switch (field?.type) {
          case 'date':
            schema = 'datetime';
            break;
          case 'geo_point':
            schema = 'json';
            break;
          case 'number':
            schema = 'numeric';
            break;
        }

        if (id === `${resultsField}.outlier_score`) {
          schema = 'numeric';
        }

        return { id, schema };
      })
    );
  }

  const colorRange = useColorRange(
    COLOR_RANGE.BLUE,
    COLOR_RANGE_SCALE.INFLUENCER,
    jobConfig !== undefined ? getFeatureCount(jobConfig.dest.results_field, tableItems) : 1
  );

  if (jobConfig === undefined || indexPattern === undefined) {
    return null;
  }

  // if it's a searchBar syntax error leave the table visible so they can try again
  if (status === INDEX_STATUS.ERROR && !errorMessage.includes('parsing_exception')) {
    return (
      <EuiPanel grow={false}>
        <ExplorationTitle jobId={jobConfig.id} />
        <EuiCallOut
          title={i18n.translate('xpack.ml.dataframe.analytics.exploration.indexError', {
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

  let tableError =
    status === INDEX_STATUS.ERROR && errorMessage.includes('parsing_exception')
      ? errorMessage
      : undefined;

  if (status === INDEX_STATUS.LOADED && tableItems.length === 0 && tableError === undefined) {
    tableError = i18n.translate('xpack.ml.dataframe.analytics.exploration.noDataCalloutBody', {
      defaultMessage:
        'The query for the index returned no results. Please make sure the index contains documents and your query is not too restrictive.',
    });
  }

  return (
    <EuiPanel data-test-subj="mlDFAnalyticsOutlierExplorationTablePanel">
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
        gutterSize="s"
      >
        <EuiFlexItem grow={false}>
          <ExplorationTitle jobId={jobConfig.id} />
        </EuiFlexItem>
        {jobStatus !== undefined && (
          <EuiFlexItem grow={false}>
            <span>{getTaskStateBadge(jobStatus)}</span>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
      {(columns.length > 0 || searchQuery !== defaultSearchQuery) && (
        <>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <ExplorationQueryBar indexPattern={indexPattern} setSearchQuery={setSearchQuery} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSpacer size="s" />
              <ColorRangeLegend
                colorRange={colorRange}
                title={i18n.translate(
                  'xpack.ml.dataframe.analytics.exploration.colorRangeLegendTitle',
                  {
                    defaultMessage: 'Feature influence score',
                  }
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          {columns.length > 0 && tableItems.length > 0 && (
            <ExplorationDataGrid
              colorRange={colorRange}
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
          )}
        </>
      )}
    </EuiPanel>
  );
});
