/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ExpandableFlyoutProps } from '../../../common/components/expandable_flyout';
import type {
  EventPanel,
  JSONPanel,
  TablePanel,
  VisualizePanel,
} from '../../../common/store/flyout/model';
import { EventDetailsPanel, EventDetailsPanelKey } from './event';
import { EventDetailsPanelProvider } from './event/context';
import { EventJSONPanel, EventJSONPanelKey } from './json';
import { EventTablePanel, EventTablePanelKey } from './table';
import { EventVisualizePanelKey, EventVisualizePanel } from './visualize';

// TODO: We have these wrappers "EventDetailsPanelProvider" to avoid prop drilling of data currently
// And allow the panels or tabs to live independently of each other. This wrapper can be avoided by
// storing the data in redux, but as redux just serves as a temporary in memory cache, and may add
// additional unnecessary bloat to our store, and bring in issues such as managing when the data should be updated
// and/or re-cached. Since react-query already solves this, and can cache the data based on the query params, we can use that instead

export const expandableFlyoutPanels: ExpandableFlyoutProps['panels'] = [
  {
    panelKind: EventDetailsPanelKey,
    size: 550,
    component: (props) => (
      <EventDetailsPanelProvider {...(props as EventPanel).params}>
        <EventDetailsPanel path={props.path as EventPanel['path']} />
      </EventDetailsPanelProvider>
    ),
  },
  {
    panelKind: EventVisualizePanelKey,
    size: 1000,
    component: (props) => (
      <EventDetailsPanelProvider {...(props as VisualizePanel).params}>
        <EventVisualizePanel />
      </EventDetailsPanelProvider>
    ),
  },
  {
    panelKind: EventTablePanelKey,
    size: 550,
    component: (props) => (
      <EventDetailsPanelProvider {...(props as TablePanel).params}>
        <EventTablePanel />
      </EventDetailsPanelProvider>
    ),
  },
  {
    panelKind: EventJSONPanelKey,
    size: 550,
    component: (props) => (
      <EventDetailsPanelProvider {...(props as JSONPanel).params}>
        <EventJSONPanel />
      </EventDetailsPanelProvider>
    ),
  },
];
