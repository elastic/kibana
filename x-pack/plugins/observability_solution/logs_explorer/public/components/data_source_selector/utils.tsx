/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Dataset, Integration } from '../../../common/datasets';
import {
  DATA_SOURCE_SELECTOR_WIDTH,
  noDataViewsDescriptionLabel,
  noDataViewsLabel,
  uncategorizedLabel,
} from './constants';
import { DatasetSelectionHandler } from './types';
import ListStatus, { ListStatusProps } from './sub_components/list_status';
import { LoadDatasets } from '../../hooks/use_datasets';

export const getPopoverButtonStyles = ({ fullWidth }: { fullWidth?: boolean }) => ({
  maxWidth: fullWidth ? undefined : DATA_SOURCE_SELECTOR_WIDTH,
});

interface IntegrationsTreeParams {
  datasets: Dataset[] | null;
  integrations: Integration[] | null;
  onDatasetSelected: DatasetSelectionHandler;
  onUncategorizedLoad: LoadDatasets;
}

export const buildIntegrationsTree = ({
  integrations,
  datasets,
  onDatasetSelected,
  onUncategorizedLoad,
}: IntegrationsTreeParams) => {
  const uncategorizedIntegration = {
    title: uncategorizedLabel,
    datasets: datasets ?? [],
    onClick: onUncategorizedLoad,
  };

  return [uncategorizedIntegration, ...(integrations ?? [])].map((integration) => ({
    ...integration,
    datasets: integration.datasets.map((dataset) => ({
      ...dataset,
      title: dataset.getFullTitle(),
      onClick: () => onDatasetSelected(dataset),
    })),
  }));
};

export const createAllLogsItem = () => {
  const allLogs = Dataset.createAllLogsDataset();
  return {
    'data-test-subj': 'dataSourceSelectorShowAllLogs',
    iconType: allLogs.iconType,
    name: allLogs.title,
  };
};

export const createDataViewsStatusItem = (
  props: Omit<ListStatusProps, 'description' | 'title'>
) => {
  return {
    disabled: true,
    name: (
      <ListStatus
        key="dataViewsStatusItem"
        description={noDataViewsDescriptionLabel}
        title={noDataViewsLabel}
        {...props}
      />
    ),
  };
};
