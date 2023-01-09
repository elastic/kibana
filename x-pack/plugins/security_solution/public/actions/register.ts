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
import { EmbeddableCopyToClipboardAction } from './copy_to_clipboard/embeddable_copy_to_clipboard_action';
import { createFilterInAction } from './filter/filter_in';
import { createFilterOutAction } from './filter/filter_out';
import { createAddToTimelineAction, EmbeddableAddToTimelineAction } from './add_to_timeline';
import { createShowTopNAction } from './show_top_n/show_top_n';
import {
  CELL_ACTIONS_DEFAULT_TRIGGER,
  CELL_ACTIONS_TIMELINE_TRIGGER,
} from '../../common/constants';
import { createCopyToClipboardAction } from './copy_to_clipboard/copy_to_clipboard';
import { createTimelineFilterInAction, createTimelineFilterOutAction } from './filter';

export const registerActions = (
  plugins: StartPlugins,
  store: SecurityAppStore,
  history: H.History,
  services: StartServices
) => {
  registerEmbeddableActions(plugins.uiActions, store);
  registerUiActions(plugins.uiActions, store, history, services);
  registerTimelineUiActions(plugins.uiActions, store, history, services);
};

const registerEmbeddableActions = (uiActions: UiActionsStart, store: SecurityAppStore) => {
  const addToTimelineAction = new EmbeddableAddToTimelineAction(store);
  uiActions.addTriggerAction(CELL_VALUE_TRIGGER, addToTimelineAction);

  const copyToClipboardAction = new EmbeddableCopyToClipboardAction();
  uiActions.addTriggerAction(CELL_VALUE_TRIGGER, copyToClipboardAction);
};

const registerUiActions = (
  uiActions: UiActionsStart,
  store: SecurityAppStore,
  history: H.History,
  services: StartServices
) => {
  const filterInAction = createFilterInAction({
    order: 1,
  });
  const filterOutAction = createFilterOutAction({
    order: 2,
  });
  const addToTimeline = createAddToTimelineAction({ store, order: 3 });
  const showTopNAction = createShowTopNAction({ store, history, services, order: 4 });
  const copyAction = createCopyToClipboardAction({ order: 5 });

  uiActions.registerTrigger({
    id: CELL_ACTIONS_DEFAULT_TRIGGER,
  });

  uiActions.addTriggerAction(CELL_ACTIONS_DEFAULT_TRIGGER, copyAction);
  uiActions.addTriggerAction(CELL_ACTIONS_DEFAULT_TRIGGER, filterInAction);
  uiActions.addTriggerAction(CELL_ACTIONS_DEFAULT_TRIGGER, filterOutAction);
  uiActions.addTriggerAction(CELL_ACTIONS_DEFAULT_TRIGGER, showTopNAction);
  uiActions.addTriggerAction(CELL_ACTIONS_DEFAULT_TRIGGER, addToTimeline);
};

const registerTimelineUiActions = (
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
  const addToTimeline = createAddToTimelineAction({ store, order: 3 });
  const showTopNAction = createShowTopNAction({ store, history, services, order: 4 });
  const copyAction = createCopyToClipboardAction({ order: 5 });

  uiActions.registerTrigger({
    id: CELL_ACTIONS_TIMELINE_TRIGGER,
  });

  uiActions.addTriggerAction(CELL_ACTIONS_TIMELINE_TRIGGER, copyAction);
  uiActions.addTriggerAction(CELL_ACTIONS_TIMELINE_TRIGGER, filterInAction);
  uiActions.addTriggerAction(CELL_ACTIONS_TIMELINE_TRIGGER, filterOutAction);
  uiActions.addTriggerAction(CELL_ACTIONS_TIMELINE_TRIGGER, showTopNAction);
  uiActions.addTriggerAction(CELL_ACTIONS_TIMELINE_TRIGGER, addToTimeline);
};
