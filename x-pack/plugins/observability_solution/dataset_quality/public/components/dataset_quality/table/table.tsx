/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';
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

const Flyout = dynamic(() => import('../../flyout/flyout'));

export const Table = () => {
  const {
    sort,
    onTableChange,
    pagination,
    renderedItems,
    columns,
    loading,
    resultsCount,
    selectedDataset,
    closeFlyout,
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
            label={fullDatasetNameLabel}
            checked={showFullDatasetNames}
            tooltipText={fullDatasetNameDescription}
            onToggle={toggleFullDatasetNames}
          />
          {canUserMonitorDataset && canUserMonitorAnyDataStream && (
            <DescriptiveSwitch
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
      {selectedDataset && <Flyout dataset={selectedDataset} closeFlyout={closeFlyout} />}
    </>
  );
};

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default Table;
