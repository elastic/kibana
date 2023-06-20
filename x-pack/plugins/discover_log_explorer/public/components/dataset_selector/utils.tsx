/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { RefCallback } from 'react';
import { EuiContextMenuPanelDescriptor, EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { PackageIcon } from '@kbn/fleet-plugin/public';
import { getIntegrationId } from '../../../common/latest';
import { Integration } from '../../../common/datasets';
import { DATA_VIEW_POPOVER_CONTENT_WIDTH } from './constants';
import { DatasetSelectionHandler, PanelId } from './types';

export const getPopoverButtonStyles = ({ fullWidth }: { fullWidth?: boolean }) => ({
  maxWidth: fullWidth ? undefined : DATA_VIEW_POPOVER_CONTENT_WIDTH,
});

interface IntegrationsTreeParams {
  integrations: Integration[];
  onStreamSelected: DatasetSelectionHandler;
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
  onStreamSelected,
}: IntegrationsTreeParams) => {
  return integrations.reduce(
    (res: IntegrationsTree, integration) => {
      const entryId: PanelId = getIntegrationId(integration);
      const { name, version, dataStreams } = integration;

      res.items.push({
        name,
        icon: <PackageIcon packageName={name} version={version} size="m" tryApi />,
        panel: entryId,
      });

      res.panels.push({
        id: entryId,
        title: name,
        width: DATA_VIEW_POPOVER_CONTENT_WIDTH,
        items: dataStreams.map((stream) => ({
          name: stream.title,
          onClick: () =>
            onStreamSelected({ title: `[${name}] ${stream.title}`, name: stream.name }),
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
