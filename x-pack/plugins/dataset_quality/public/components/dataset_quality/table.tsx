/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiHorizontalRule, EuiSpacer, EuiText, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { dynamic } from '@kbn/shared-ux-utility';
import { loadingDatasetsText, noDatasetsTitle } from '../../../common/translations';
import { useDatasetQualityTable } from '../../hooks';

const Flyout = dynamic(() => import('../flyout/flyout'));

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
  } = useDatasetQualityTable();

  return (
    <>
      <EuiText size="xs">
        <FormattedMessage
          id="xpack.datasetQuality.tableSummary"
          defaultMessage="Showing {items} Datasets"
          values={{
            items: resultsCount,
          }}
        />
      </EuiText>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" style={{ height: 2 }} />
      <EuiBasicTable
        tableLayout="auto"
        sorting={sort}
        onChange={onTableChange}
        pagination={pagination}
        data-test-subj="datasetQualityTable"
        isSelectable
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
