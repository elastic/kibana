/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Dataset, Integration } from '../../../common/datasets';
import { DATA_SOURCE_SELECTOR_WIDTH, uncategorizedLabel } from './constants';
import { DatasetSelectionHandler } from './types';

export const getPopoverButtonStyles = ({ fullWidth }: { fullWidth?: boolean }) => ({
  maxWidth: fullWidth ? undefined : DATA_SOURCE_SELECTOR_WIDTH,
});

interface IntegrationsTreeParams {
  datasets: Dataset[] | null;
  datasetsFallback?: React.ReactNode;
  integrations: Integration[] | null;
  isLoadingUncategorized: boolean;
  onDatasetSelected: DatasetSelectionHandler;
}

export interface DatasetTreeItem extends Pick<Dataset, 'id' | 'iconType' | 'name' | 'title'> {
  onClick: () => void;
}

export interface IntegrationTreeItem
  extends Pick<
    Integration,
    'id' | 'name' | 'title' | 'description' | 'icons' | 'status' | 'version'
  > {
  content?: React.ReactNode;
  isLoading?: boolean;
  datasets?: DatasetTreeItem[];
}

export const buildIntegrationsTree = ({
  integrations,
  datasets,
  datasetsFallback,
  isLoadingUncategorized,
  onDatasetSelected,
}: IntegrationsTreeParams): IntegrationTreeItem[] => {
  const uncategorizedIntegration = {
    id: 'integration-uncategorized-1.0.0',
    title: uncategorizedLabel,
    name: 'uncategorized',
    status: 'installed',
    version: '1.0.0',
    datasets,
    content: datasetsFallback,
    isLoading: isLoadingUncategorized,
  } as Omit<Integration, 'dataStreams'> & {
    datasets: Dataset[] | null;
  };

  return [uncategorizedIntegration, ...(integrations ?? [])].map((integration) => ({
    ...integration,
    datasets: integration.datasets?.map((dataset) => ({
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
