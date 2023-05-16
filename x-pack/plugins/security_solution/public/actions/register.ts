/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CELL_VALUE_TRIGGER } from '@kbn/embeddable-plugin/public';
import type * as H from 'history';
import type { SecurityAppStore } from '../common/store/types';
import type { StartServices } from '../types';
import { createFilterInCellActionFactory, createFilterOutCellActionFactory } from './filter';
import {
  createAddToTimelineLensAction,
  createAddToTimelineCellActionFactory,
  createInvestigateInNewTimelineCellActionFactory,
} from './add_to_timeline';
import { createShowTopNCellActionFactory } from './show_top_n';
import {
  createCopyToClipboardLensAction,
  createCopyToClipboardCellActionFactory,
} from './copy_to_clipboard';
import { createToggleColumnCellActionFactory } from './toggle_column';
import { SecurityCellActionsTrigger } from './constants';
import type { SecurityCellActionName, SecurityCellActions } from './types';
import { enhanceActionWithTelemetry } from './telemetry';

export const registerUIActions = (
  store: SecurityAppStore,
  history: H.History,
  services: StartServices
) => {
  registerLensActions(store, services);
  registerCellActions(store, history, services);
};

const registerLensActions = (store: SecurityAppStore, services: StartServices) => {
  const { uiActions } = services;

  const addToTimelineAction = createAddToTimelineLensAction({ store, order: 1 });
  uiActions.addTriggerAction(CELL_VALUE_TRIGGER, addToTimelineAction);

  const copyToClipboardAction = createCopyToClipboardLensAction({ order: 2 });
  uiActions.addTriggerAction(CELL_VALUE_TRIGGER, copyToClipboardAction);
};

const registerCellActions = (
  store: SecurityAppStore,
  history: H.History,
  services: StartServices
) => {
  const cellActions: SecurityCellActions = {
    filterIn: createFilterInCellActionFactory({ store, services }),
    filterOut: createFilterOutCellActionFactory({ store, services }),
    addToTimeline: createAddToTimelineCellActionFactory({ store, services }),
    investigateInNewTimeline: createInvestigateInNewTimelineCellActionFactory({ store, services }),
    showTopN: createShowTopNCellActionFactory({ store, history, services }),
    copyToClipboard: createCopyToClipboardCellActionFactory({ services }),
    toggleColumn: createToggleColumnCellActionFactory({ store }),
  };

  registerCellActionsTrigger({
    triggerId: SecurityCellActionsTrigger.DEFAULT,
    cellActions,
    actionsOrder: ['filterIn', 'filterOut', 'addToTimeline', 'showTopN', 'copyToClipboard'],
    services,
  });

  registerCellActionsTrigger({
    triggerId: SecurityCellActionsTrigger.DETAILS_FLYOUT,
    cellActions,
    actionsOrder: [
      'filterIn',
      'filterOut',
      'addToTimeline',
      'toggleColumn',
      'showTopN',
      'copyToClipboard',
    ],
    services,
  });

  registerCellActionsTrigger({
    triggerId: SecurityCellActionsTrigger.ALERTS_COUNT,
    cellActions,
    actionsOrder: ['investigateInNewTimeline'],
    services,
  });
};

const registerCellActionsTrigger = ({
  triggerId,
  cellActions,
  actionsOrder,
  services,
}: {
  triggerId: SecurityCellActionsTrigger;
  cellActions: SecurityCellActions;
  actionsOrder: SecurityCellActionName[];
  services: StartServices;
}) => {
  const { uiActions } = services;
  uiActions.registerTrigger({ id: triggerId });

  actionsOrder.forEach((actionName, order) => {
    const actionFactory = cellActions[actionName];
    if (actionFactory) {
      const action = actionFactory({ id: `${triggerId}-${actionName}`, order });

      uiActions.addTriggerAction(triggerId, enhanceActionWithTelemetry(action, services));
    }
  });
};
