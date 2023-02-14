/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CELL_VALUE_TRIGGER } from '@kbn/embeddable-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type * as H from 'history';
import type { SecurityAppStore } from '../common/store/types';
import type { StartPlugins, StartServices } from '../types';
import { createFilterInCellActionFactory, createFilterOutCellActionFactory } from './filter';
import {
  createAddToTimelineLensAction,
  createAddToTimelineCellActionFactory,
} from './add_to_timeline';
import { createShowTopNCellActionFactory } from './show_top_n';
import {
  createCopyToClipboardLensAction,
  createCopyToClipboardCellActionFactory,
} from './copy_to_clipboard';
import { createToggleColumnCellActionFactory } from './toggle_column';
import { CELL_ACTIONS_DEFAULT_TRIGGER, CELL_ACTIONS_DETAILS_FLYOUT_TRIGGER } from './constants';
import type { SecurityCellActionName, SecurityCellActions } from './types';

export const registerUIActions = (
  { uiActions }: StartPlugins,
  store: SecurityAppStore,
  history: H.History,
  services: StartServices
) => {
  registerLensActions(uiActions, store);
  registerCellActions(uiActions, store, history, services);
};

const registerLensActions = (uiActions: UiActionsStart, store: SecurityAppStore) => {
  const addToTimelineAction = createAddToTimelineLensAction({ store, order: 1 });
  uiActions.addTriggerAction(CELL_VALUE_TRIGGER, addToTimelineAction);

  const copyToClipboardAction = createCopyToClipboardLensAction({ order: 2 });
  uiActions.addTriggerAction(CELL_VALUE_TRIGGER, copyToClipboardAction);
};

const registerCellActions = (
  uiActions: UiActionsStart,
  store: SecurityAppStore,
  history: H.History,
  services: StartServices
) => {
  const cellActions: SecurityCellActions = {
    filterIn: createFilterInCellActionFactory({ store, services }),
    filterOut: createFilterOutCellActionFactory({ store, services }),
    addToTimeline: createAddToTimelineCellActionFactory({ store, services }),
    showTopN: createShowTopNCellActionFactory({ store, history, services }),
    copyToClipboard: createCopyToClipboardCellActionFactory({ services }),
    toggleColumn: createToggleColumnCellActionFactory({ store }),
  };

  registerCellActionsTrigger(uiActions, CELL_ACTIONS_DEFAULT_TRIGGER, cellActions, [
    'filterIn',
    'filterOut',
    'addToTimeline',
    'showTopN',
    'copyToClipboard',
  ]);

  registerCellActionsTrigger(uiActions, CELL_ACTIONS_DETAILS_FLYOUT_TRIGGER, cellActions, [
    'filterIn',
    'filterOut',
    'addToTimeline',
    'toggleColumn',
    'showTopN',
    'copyToClipboard',
  ]);
};

const registerCellActionsTrigger = (
  uiActions: UiActionsStart,
  triggerId: string,
  cellActions: SecurityCellActions,
  actionsOrder: SecurityCellActionName[]
) => {
  uiActions.registerTrigger({ id: triggerId });

  actionsOrder.forEach((actionName, order) => {
    const actionFactory = cellActions[actionName];
    uiActions.addTriggerAction(
      triggerId,
      actionFactory({ id: `${triggerId}-${actionName}`, order })
    );
  });
};
