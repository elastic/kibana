/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiContextMenuItem, EuiEmptyPrompt, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ReloadDatasets } from '../../../hooks/use_datasets';
import {
  errorLabel,
  noDatasetsDescriptionLabel,
  noDatasetsLabel,
  noDataRetryLabel,
} from '../constants';
import { Dataset } from '../../../../common/datasets';
import { DatasetSkeleton } from './datasets_skeleton';
import { DatasetSelectionHandler } from '../types';

interface DatasetListProps {
  datasets: Dataset[] | null;
  error: Error | null;
  isLoading: boolean;
  onRetry: ReloadDatasets;
  onDatasetClick: DatasetSelectionHandler;
}

export const DatasetsList = ({
  datasets,
  error,
  isLoading,
  onRetry,
  onDatasetClick,
}: DatasetListProps) => {
  const isEmpty = datasets == null || datasets.length <= 0;
  const hasError = error !== null;

  if (isLoading) {
    return <DatasetSkeleton />;
  }

  if (hasError) {
    return (
      <EuiEmptyPrompt
        data-test-subj="datasetErrorPrompt"
        iconType="warning"
        iconColor="danger"
        paddingSize="m"
        title={<h2>{noDatasetsLabel}</h2>}
        titleSize="s"
        body={
          <FormattedMessage
            id="xpack.logExplorer.datasetSelector.noDatasetsError"
            defaultMessage="An {error} occurred while getting your data streams. Please retry."
            values={{
              error: (
                <EuiToolTip content={error.message}>
                  <EuiText color="danger">{errorLabel}</EuiText>
                </EuiToolTip>
              ),
            }}
          />
        }
        actions={[<EuiButton onClick={onRetry}>{noDataRetryLabel}</EuiButton>]}
      />
    );
  }

  if (isEmpty) {
    return (
      <EuiEmptyPrompt
        data-test-subj="emptyDatasetPrompt"
        iconType="search"
        paddingSize="m"
        title={<h2>{noDatasetsLabel}</h2>}
        titleSize="s"
        body={<p>{noDatasetsDescriptionLabel}</p>}
      />
    );
  }

  return datasets.map((dataset) => (
    <EuiContextMenuItem key={dataset.id} onClick={() => onDatasetClick(dataset)}>
      {dataset.name}
    </EuiContextMenuItem>
  ));
};

// eslint-disable-next-line import/no-default-export
export default DatasetsList;
