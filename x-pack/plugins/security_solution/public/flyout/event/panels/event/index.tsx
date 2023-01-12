/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EventPanel } from '../../../../common/store/flyout/model';
import { useExpandableFlyoutContext } from '../../../context';
import { EventTabbedContent } from './content';
import { EventHeader } from './header';
import type { EventTabsType } from './tabs';
import { eventTabIds } from './tabs';

export const EventDetailsPanelKey: EventPanel['panelKind'] = 'event';

export const EventDetailsPanel: React.FC<EventPanel> = React.memo(({ path }) => {
  const { updateFlyoutPanels } = useExpandableFlyoutContext();

  const selectedTabId = useMemo(() => {
    const defaultTab = eventTabIds[0];
    if (!path) return defaultTab;
    return eventTabIds.find((tabId) => tabId === path[0]) ?? defaultTab;
  }, [path]);

  const setSelectedTabId = (tabId: EventTabsType[number]['id']) => {
    updateFlyoutPanels({
      right: { panelKind: 'event', path: [tabId] },
    });
  };

  return (
    <>
      <EventHeader selectedTabId={selectedTabId} setSelectedTabId={setSelectedTabId} />
      <EventTabbedContent selectedTabId={selectedTabId} />
    </>
  );
});

EventDetailsPanel.displayName = 'EventDetailsPanel';
