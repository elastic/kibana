/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CELL_VALUE_TRIGGER } from '@kbn/embeddable-plugin/public';
import type { History } from 'history';
import { SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID } from '@kbn/discover-plugin/public';
import type { SecurityAppStore } from '../common/store/types';
import type { StartServices } from '../types';
import {
  createFilterInCellActionFactory,
  createFilterInDiscoverCellActionFactory,
  createFilterOutCellActionFactory,
  createFilterOutDiscoverCellActionFactory,
} from './filter';
import {
  createAddToTimelineLensAction,
  createAddToTimelineCellActionFactory,
  createInvestigateInNewTimelineCellActionFactory,
  createAddToTimelineDiscoverCellActionFactory,
} from './add_to_timeline';
import { createShowTopNCellActionFactory } from './show_top_n';
import {
  createCopyToClipboardLensAction,
  createCopyToClipboardCellActionFactory,
  createCopyToClipboardDiscoverCellActionFactory,
} from './copy_to_clipboard';
import { createToggleColumnCellActionFactory } from './toggle_column';
import { SecurityCellActionsTrigger } from './constants';
import type {
  DiscoverCellActionName,
  DiscoverCellActions,
  SecurityCellActionName,
  SecurityCellActions,
} from './types';
import { enhanceActionWithTelemetry } from './telemetry';

export const registerUIActions = (
  store: SecurityAppStore,
  history: History,
  services: StartServices
) => {
  registerLensEmbeddableActions(store, services);
  registerDiscoverCellActions(store, services);
  registerCellActions(store, history, services);
};

const registerLensEmbeddableActions = (store: SecurityAppStore, services: StartServices) => {
  const { uiActions } = services;

  const addToTimelineAction = createAddToTimelineLensAction({ store, order: 1 });
  uiActions.addTriggerAction(CELL_VALUE_TRIGGER, addToTimelineAction);

  const copyToClipboardAction = createCopyToClipboardLensAction({ order: 2 });
  uiActions.addTriggerAction(CELL_VALUE_TRIGGER, copyToClipboardAction);
};

const registerDiscoverCellActions = (store: SecurityAppStore, services: StartServices) => {
  const { uiActions } = services;

  const DiscoverCellActionsFactories: DiscoverCellActions = {
    filterIn: createFilterInDiscoverCellActionFactory({ store, services }),
    filterOut: createFilterOutDiscoverCellActionFactory({ store, services }),
    addToTimeline: createAddToTimelineDiscoverCellActionFactory({ store, services }),
    copyToClipboard: createCopyToClipboardDiscoverCellActionFactory({ services }),
  };

  const addDiscoverEmbeddableCellActions = (
    triggerId: string,
    actionsOrder: DiscoverCellActionName[]
  ) => {
    actionsOrder.forEach((actionName, order) => {
      const actionFactory = DiscoverCellActionsFactories[actionName];
      if (actionFactory) {
        const action = actionFactory({ id: `${triggerId}-${actionName}`, order });
        const actionWithTelemetry = enhanceActionWithTelemetry(action, services);
        uiActions.addTriggerAction(triggerId, actionWithTelemetry);
      }
    });
  };

  // this trigger is already registered by discover search embeddable
  addDiscoverEmbeddableCellActions(SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID, [
    'filterIn',
    'filterOut',
    'addToTimeline',
    'copyToClipboard',
  ]);
};

const registerCellActions = (
  store: SecurityAppStore,
  history: History,
  services: StartServices
) => {
  const { uiActions } = services;

  const cellActionsFactories: SecurityCellActions = {
    filterIn: createFilterInCellActionFactory({ store, services }),
    filterOut: createFilterOutCellActionFactory({ store, services }),
    addToTimeline: createAddToTimelineCellActionFactory({ store, services }),
    investigateInNewTimeline: createInvestigateInNewTimelineCellActionFactory({ store, services }),
    showTopN: createShowTopNCellActionFactory({ services }),
    copyToClipboard: createCopyToClipboardCellActionFactory({ services }),
    toggleColumn: createToggleColumnCellActionFactory({ store }),
  };

  const registerCellActionsTrigger = (
    triggerId: SecurityCellActionsTrigger,
    actionsOrder: SecurityCellActionName[]
  ) => {
    uiActions.registerTrigger({ id: triggerId });
    actionsOrder.forEach((actionName, order) => {
      const actionFactory = cellActionsFactories[actionName];
      if (actionFactory) {
        const action = actionFactory({ id: `${triggerId}-${actionName}`, order });
        const actionWithTelemetry = enhanceActionWithTelemetry(action, services);
        uiActions.addTriggerAction(triggerId, actionWithTelemetry);
      }
    });
  };

  registerCellActionsTrigger(SecurityCellActionsTrigger.DEFAULT, [
    'filterIn',
    'filterOut',
    'addToTimeline',
    'showTopN',
    'copyToClipboard',
  ]);

  registerCellActionsTrigger(SecurityCellActionsTrigger.DETAILS_FLYOUT, [
    'filterIn',
    'filterOut',
    'addToTimeline',
    'toggleColumn',
    'showTopN',
    'copyToClipboard',
  ]);

  registerCellActionsTrigger(SecurityCellActionsTrigger.ALERTS_COUNT, ['investigateInNewTimeline']);
};
