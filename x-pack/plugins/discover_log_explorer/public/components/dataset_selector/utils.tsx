/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { RefCallback } from 'react';
import { EuiContextMenuPanelDescriptor, EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { PackageIcon } from '@kbn/fleet-plugin/public';
import { Integration } from '../../../common/datasets';
import { DATA_VIEW_POPOVER_CONTENT_WIDTH } from './constants';
import { DatasetSelectionHandler } from './types';

export const getPopoverButtonStyles = ({ fullWidth }: { fullWidth?: boolean }) => ({
  maxWidth: fullWidth ? undefined : DATA_VIEW_POPOVER_CONTENT_WIDTH,
});

interface IntegrationsTreeParams {
  integrations: Integration[];
  onDatasetSelected: DatasetSelectionHandler;
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
}: IntegrationsTreeParams) => {
  return integrations.reduce(
    (res: IntegrationsTree, integration) => {
      const { name, version, datasets } = integration;

      res.items.push({
        name,
        icon: <PackageIcon packageName={name} version={version} size="m" tryApi />,
        panel: integration.id,
      });

      res.panels.push({
        id: integration.id,
        title: name,
        width: DATA_VIEW_POPOVER_CONTENT_WIDTH,
        items: datasets.map((dataset) => ({
          name: dataset.title,
          onClick: () => onDatasetSelected(dataset),
        })),
      });

      return res;
    },
    { items: [], panels: [] }
  );
};

/**
 * Take a list of EuiContextMenuPanelItemDescriptor and, if exists,
 * attach the passed reference to the last item.
 */
export const setIntegrationListSpy = (
  items: EuiContextMenuPanelItemDescriptor[],
  spyRef: RefCallback<HTMLButtonElement>
) => {
  const lastItem = items.at(-1);
  if (lastItem) {
    lastItem.buttonRef = spyRef;
  }
};
