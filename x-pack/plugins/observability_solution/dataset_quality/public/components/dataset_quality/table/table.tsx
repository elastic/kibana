/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  fullDatasetNameDescription,
  fullDatasetNameLabel,
  inactiveDatasetsDescription,
  inactiveDatasetsLabel,
  loadingDatasetsText,
  noDatasetsTitle,
} from '../../../../common/translations';
import { useDatasetQualityTable } from '../../../hooks';
import { DescriptiveSwitch } from '../../common/descriptive_switch';

export const Table = () => {
  const {
    sort,
    onTableChange,
    pagination,
    renderedItems,
    columns,
    loading,
    resultsCount,
    showInactiveDatasets,
    showFullDatasetNames,
    canUserMonitorDataset,
    canUserMonitorAnyDataStream,
    toggleInactiveDatasets,
    toggleFullDatasetNames,
  } = useDatasetQualityTable();

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.datasetQuality.tableSummary"
            defaultMessage="Showing {items} Datasets"
            values={{
              items: resultsCount,
            }}
          />
        </EuiText>
        <EuiFlexGroup gutterSize="m" justifyContent="flexEnd">
          <DescriptiveSwitch
            testSubject="datasetQualityFullDatasetNameSwitch"
            label={fullDatasetNameLabel}
            checked={showFullDatasetNames}
            tooltipText={fullDatasetNameDescription}
            onToggle={toggleFullDatasetNames}
          />
          {canUserMonitorDataset && canUserMonitorAnyDataStream && (
            <DescriptiveSwitch
              testSubject="datasetQualityInactiveDatasetsSwitch"
              label={inactiveDatasetsLabel}
              checked={showInactiveDatasets}
              tooltipText={inactiveDatasetsDescription}
              onToggle={toggleInactiveDatasets}
            />
          )}
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" style={{ height: 2 }} />
      <EuiBasicTable
        tableLayout="auto"
        sorting={sort}
        onChange={onTableChange}
        pagination={pagination}
        data-test-subj="datasetQualityTable"
        rowProps={{
          'data-test-subj': 'datasetQualityTableRow',
        }}
        items={renderedItems}
        columns={columns}
        loading={loading}
        noItemsMessage={
          loading ? (
            loadingDatasetsText
          ) : (
            <EuiEmptyPrompt
              data-test-subj="datasetQualityTableNoData"
              layout="vertical"
              title={<h2>{noDatasetsTitle}</h2>}
              hasBorder={false}
              titleSize="m"
            />
          )
        }
      />
    </>
  );
};

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default Table;
