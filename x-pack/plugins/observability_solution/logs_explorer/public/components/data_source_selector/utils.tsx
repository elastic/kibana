/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { RefCallback } from 'react';
import { EuiContextMenuPanelDescriptor, EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { PackageIcon } from '@kbn/fleet-plugin/public';
import { Dataset, Integration } from '../../../common/datasets';
import {
  DATA_SOURCE_SELECTOR_WIDTH,
  noDatasetsDescriptionLabel,
  noDatasetsLabel,
  noDataViewsDescriptionLabel,
  noDataViewsLabel,
  noIntegrationsDescriptionLabel,
  noIntegrationsLabel,
} from './constants';
import { DatasetSelectionHandler } from './types';
import ListStatus, { ListStatusProps } from './sub_components/list_status';

export const getPopoverButtonStyles = ({ fullWidth }: { fullWidth?: boolean }) => ({
  maxWidth: fullWidth ? undefined : DATA_SOURCE_SELECTOR_WIDTH,
});

interface IntegrationsTreeParams {
  integrations: Integration[];
  onDatasetSelected: DatasetSelectionHandler;
  spyRef: RefCallback<HTMLButtonElement>;
}

interface IntegrationsTree {
  items: EuiContextMenuPanelItemDescriptor[];
  panels: EuiContextMenuPanelDescriptor[];
}

/**
 * The `EuiContextMenu` component receives a list of panels,
 * each one with a pointer id which is used as a reference for the items to know
 * what panel they refer to.
 * This helper function, starting from a list of integrations,
 * generate the necessary item entries for each integration,
 * and also create a related panel that render the list of data streams for the integration.
 */
export const buildIntegrationsTree = ({
  integrations,
  onDatasetSelected,
  spyRef,
}: IntegrationsTreeParams) => {
  return integrations.reduce(
    (integrationsTree: IntegrationsTree, integration, pos) => {
      const { name, title, version, datasets, icons } = integration;
      const isLastIntegration = pos === integrations.length - 1;

      integrationsTree.items.push({
        name: title,
        icon: <PackageIcon packageName={name} version={version} size="m" icons={icons} tryApi />,
        'data-test-subj': integration.id,
        panel: integration.id,
        ...(isLastIntegration && { buttonRef: spyRef }),
      });

      integrationsTree.panels.push({
        id: integration.id,
        title,
        width: DATA_SOURCE_SELECTOR_WIDTH,
        items: datasets.map((dataset) => ({
          name: dataset.title,
          onClick: () => onDatasetSelected(dataset),
        })),
      });

      return integrationsTree;
    },
    { items: [], panels: [] }
  );
};

export const createAllLogsItem = () => {
  const allLogs = Dataset.createAllLogsDataset();
  return {
    'data-test-subj': 'dataSourceSelectorShowAllLogs',
    iconType: allLogs.iconType,
    name: allLogs.title,
  };
};

export const createIntegrationStatusItem = (
  props: Omit<ListStatusProps, 'description' | 'title'>
) => {
  return {
    disabled: true,
    name: (
      <ListStatus
        key="integrationStatusItem"
        description={noIntegrationsDescriptionLabel}
        title={noIntegrationsLabel}
        {...props}
      />
    ),
  };
};

export const createUncategorizedStatusItem = (
  props: Omit<ListStatusProps, 'description' | 'title'>
) => {
  return {
    disabled: true,
    name: (
      <ListStatus
        key="uncategorizedStatusItem"
        description={noDatasetsDescriptionLabel}
        title={noDatasetsLabel}
        {...props}
      />
    ),
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
