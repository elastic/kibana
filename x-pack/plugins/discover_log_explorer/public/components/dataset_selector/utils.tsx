/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { RefCallback } from 'react';
import {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
  EuiIcon,
} from '@elastic/eui';
import { PackageIcon } from '@kbn/fleet-plugin/public';
import { Dataset, Integration } from '../../../common/datasets';
import {
  DATA_VIEW_POPOVER_CONTENT_WIDTH,
  uncategorizedLabel,
  UNMANAGED_STREAMS_PANEL_ID,
} from './constants';
import { DatasetSelectionHandler } from './types';
import { LoadDatasets } from '../../hooks/use_datasets';
import { dynamic } from '../../utils/dynamic';
import type { IntegrationsListStatusProps } from './sub_components/integrations_list_status';

const IntegrationsListStatus = dynamic(() => import('./sub_components/integrations_list_status'));

export const getPopoverButtonStyles = ({ fullWidth }: { fullWidth?: boolean }) => ({
  maxWidth: fullWidth ? undefined : DATA_VIEW_POPOVER_CONTENT_WIDTH,
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
        width: DATA_VIEW_POPOVER_CONTENT_WIDTH,
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

export const createAllLogDatasetsItem = ({ onClick }: { onClick(): void }) => {
  const allLogDataset = Dataset.createAllLogsDataset();
  return {
    name: allLogDataset.title,
    'data-test-subj': 'allLogDatasets',
    icon: allLogDataset.iconType && <EuiIcon type={allLogDataset.iconType} />,
    onClick,
  };
};

export const createUnmanagedDatasetsItem = ({ onClick }: { onClick: LoadDatasets }) => {
  return {
    name: uncategorizedLabel,
    'data-test-subj': 'unmanagedDatasets',
    icon: <EuiIcon type="documents" />,
    onClick,
    panel: UNMANAGED_STREAMS_PANEL_ID,
  };
};

export const createIntegrationStatusItem = (props: IntegrationsListStatusProps) => {
  return {
    disabled: true,
    name: <IntegrationsListStatus {...props} />,
    'data-test-subj': 'integrationStatusItem',
  };
};
