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
import {
  createLensCopyToClipboardAction,
  createDefaultCopyToClipboardAction,
} from './copy_to_clipboard';
import {
  createDefaultFilterInAction,
  createDefaultFilterOutAction,
  createTimelineFilterInAction,
  createTimelineFilterOutAction,
} from './filter';
import { createLensAddToTimelineAction, createDefaultAddToTimelineAction } from './add_to_timeline';
import { createDefaultShowTopNAction } from './show_top_n';
import {
  CELL_ACTIONS_DEFAULT_TRIGGER,
  CELL_ACTIONS_TIMELINE_TRIGGER,
} from '../../common/constants';

export const registerUIActions = (
  plugins: StartPlugins,
  store: SecurityAppStore,
  history: H.History,
  services: StartServices
) => {
  registerLensActions(plugins.uiActions, store);
  registerDefaultActions(plugins.uiActions, store, history, services);
  registerTimelineActions(plugins.uiActions, store, history, services);
};

const registerLensActions = (uiActions: UiActionsStart, store: SecurityAppStore) => {
  const addToTimelineAction = createLensAddToTimelineAction({ store, order: 1 });
  uiActions.addTriggerAction(CELL_VALUE_TRIGGER, addToTimelineAction);

  const copyToClipboardAction = createLensCopyToClipboardAction({ order: 2 });
  uiActions.addTriggerAction(CELL_VALUE_TRIGGER, copyToClipboardAction);
};

const registerDefaultActions = (
  uiActions: UiActionsStart,
  store: SecurityAppStore,
  history: H.History,
  services: StartServices
) => {
  const filterInAction = createDefaultFilterInAction({
    order: 1,
  });
  const filterOutAction = createDefaultFilterOutAction({
    order: 2,
  });
  const addToTimeline = createDefaultAddToTimelineAction({ store, order: 3 });
  const showTopNAction = createDefaultShowTopNAction({ store, history, services, order: 4 });
  const copyAction = createDefaultCopyToClipboardAction({ order: 5 });

  uiActions.registerTrigger({
    id: CELL_ACTIONS_DEFAULT_TRIGGER,
  });

  uiActions.addTriggerAction(CELL_ACTIONS_DEFAULT_TRIGGER, copyAction);
  uiActions.addTriggerAction(CELL_ACTIONS_DEFAULT_TRIGGER, filterInAction);
  uiActions.addTriggerAction(CELL_ACTIONS_DEFAULT_TRIGGER, filterOutAction);
  uiActions.addTriggerAction(CELL_ACTIONS_DEFAULT_TRIGGER, showTopNAction);
  uiActions.addTriggerAction(CELL_ACTIONS_DEFAULT_TRIGGER, addToTimeline);
};

const registerTimelineActions = (
  uiActions: UiActionsStart,
  store: SecurityAppStore,
  history: H.History,
  services: StartServices
) => {
  const filterInAction = createTimelineFilterInAction({
    store,
    order: 1,
  });
  const filterOutAction = createTimelineFilterOutAction({
    store,
    order: 2,
  });
  const addToTimeline = createDefaultAddToTimelineAction({ store, order: 3 });
  const showTopNAction = createDefaultShowTopNAction({ store, history, services, order: 4 });
  const copyAction = createDefaultCopyToClipboardAction({ order: 5 });

  uiActions.registerTrigger({
    id: CELL_ACTIONS_TIMELINE_TRIGGER,
  });

  uiActions.addTriggerAction(CELL_ACTIONS_TIMELINE_TRIGGER, copyAction);
  uiActions.addTriggerAction(CELL_ACTIONS_TIMELINE_TRIGGER, filterInAction);
  uiActions.addTriggerAction(CELL_ACTIONS_TIMELINE_TRIGGER, filterOutAction);
  uiActions.addTriggerAction(CELL_ACTIONS_TIMELINE_TRIGGER, showTopNAction);
  uiActions.addTriggerAction(CELL_ACTIONS_TIMELINE_TRIGGER, addToTimeline);
};
