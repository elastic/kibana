/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuPanelDescriptor, EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { PackageIcon } from '@kbn/fleet-plugin/public';
import React, { RefCallback } from 'react';
import { getIntegrationId } from '../../../common';
import { Integration, SearchStrategy } from '../../../common/data_streams';
import {
  DATA_VIEW_POPOVER_CONTENT_WIDTH,
  INTEGRATION_PANEL_ID,
  UNCATEGORIZED_STREAMS_PANEL_ID,
} from './constants';
import { PanelId, DataStreamSelectionHandler } from './types';

export const getPopoverButtonStyles = ({ fullWidth }: { fullWidth?: boolean }) => ({
  maxWidth: fullWidth ? undefined : DATA_VIEW_POPOVER_CONTENT_WIDTH,
});

interface IntegrationsTreeParams {
  integrations: Integration[];
  onStreamSelected: DataStreamSelectionHandler;
}

interface IntegrationsTree {
  items: EuiContextMenuPanelItemDescriptor[];
  panels: EuiContextMenuPanelDescriptor[];
}

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

export const setIntegrationListSpy = (
  items: EuiContextMenuPanelItemDescriptor[],
  spyRef: RefCallback<HTMLButtonElement>
) => {
  const lastItem = items.at(-1);
  if (lastItem) {
    lastItem.buttonRef = spyRef;
  }
};

export const getSearchStrategy = (panelId: PanelId) => {
  if (panelId === UNCATEGORIZED_STREAMS_PANEL_ID) return SearchStrategy.DATA_STREAMS;
  if (panelId === INTEGRATION_PANEL_ID) return SearchStrategy.INTEGRATIONS;
  return SearchStrategy.INTEGRATIONS_DATA_STREAMS;
};
