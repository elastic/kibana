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
import { createFilterInCellAction, createFilterOutCellAction } from './filter';
import { createAddToTimelineLensAction, createAddToTimelineCellAction } from './add_to_timeline';
import { createShowTopNCellAction } from './show_top_n';
import {
  createCopyToClipboardLensAction,
  createCopyToClipboardCellAction,
} from './copy_to_clipboard';
import { createToggleColumnCellAction } from './toggle_column';
import {
  CELL_ACTIONS_DEFAULT_TRIGGER,
  CELL_ACTIONS_DETAILS_FLYOUT_TRIGGER,
} from '../../common/constants';

export const registerUIActions = (
  plugins: StartPlugins,
  store: SecurityAppStore,
  history: H.History,
  services: StartServices
) => {
  registerLensActions(plugins.uiActions, store);
  registerCellActions(plugins.uiActions, store, history, services);
  registerTableFlyoutActions(plugins.uiActions, store, history, services);
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
  const filterInAction = createFilterInCellAction({
    order: 1,
    store,
  });
  const filterOutAction = createFilterOutCellAction({
    order: 2,
    store,
  });
  const addToTimeline = createAddToTimelineCellAction({ store, order: 3 });
  const showTopNAction = createShowTopNCellAction({ store, history, services, order: 4 });
  const copyAction = createCopyToClipboardCellAction({ order: 5 });

  uiActions.registerTrigger({
    id: CELL_ACTIONS_DEFAULT_TRIGGER,
  });

  uiActions.addTriggerAction(CELL_ACTIONS_DEFAULT_TRIGGER, filterInAction);
  uiActions.addTriggerAction(CELL_ACTIONS_DEFAULT_TRIGGER, filterOutAction);
  uiActions.addTriggerAction(CELL_ACTIONS_DEFAULT_TRIGGER, addToTimeline);
  uiActions.addTriggerAction(CELL_ACTIONS_DEFAULT_TRIGGER, showTopNAction);
  uiActions.addTriggerAction(CELL_ACTIONS_DEFAULT_TRIGGER, copyAction);
};

/**
 * This actions show up in when a details flyout is open from a table field.
 */
const registerTableFlyoutActions = (
  uiActions: UiActionsStart,
  store: SecurityAppStore,
  history: H.History,
  services: StartServices
) => {
  const filterInAction = createFilterInCellAction({
    store,
    order: 10,
  });
  const filterOutAction = createFilterOutCellAction({
    store,
    order: 20,
  });

  const addToTimeline = createAddToTimelineCellAction({ store, order: 30 });
  const toggleAction = createToggleColumnCellAction({ store, order: 35 });
  const showTopNAction = createShowTopNCellAction({ store, history, services, order: 40 });
  const copyAction = createCopyToClipboardCellAction({ order: 50 });

  uiActions.registerTrigger({
    id: CELL_ACTIONS_DETAILS_FLYOUT_TRIGGER,
  });

  uiActions.addTriggerAction(CELL_ACTIONS_DETAILS_FLYOUT_TRIGGER, copyAction);
  uiActions.addTriggerAction(CELL_ACTIONS_DETAILS_FLYOUT_TRIGGER, filterInAction);
  uiActions.addTriggerAction(CELL_ACTIONS_DETAILS_FLYOUT_TRIGGER, filterOutAction);
  uiActions.addTriggerAction(CELL_ACTIONS_DETAILS_FLYOUT_TRIGGER, showTopNAction);
  uiActions.addTriggerAction(CELL_ACTIONS_DETAILS_FLYOUT_TRIGGER, addToTimeline);
  uiActions.addTriggerAction(CELL_ACTIONS_DETAILS_FLYOUT_TRIGGER, toggleAction);
};
