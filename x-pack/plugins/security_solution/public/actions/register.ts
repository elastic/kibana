/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CELL_VALUE_TRIGGER } from '@kbn/embeddable-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { ScopedHistory, CoreStart } from '@kbn/core/public';
import type { SecurityAppStore } from '../common/store/types';
import type { StartPlugins, StartServices } from '../types';
import { AddToTimelineAction } from './add_to_timeline/add_to_timeline_action';
import { CopyToClipboardAction } from './copy_to_clipboard/copy_to_clipboard_action';
import { createFilterInAction } from './filter_in';
import { createFilterOutAction } from './filter_out';
import { createAddToTimelineAction } from './add_to_timeline';
import { createShowTopNAction } from './show_top_n';
import { createCopyToClipboardAction } from './copy_to_clipboard';
import { SECURITY_SOLUTION_ACTION_TRIGGER } from '../../common/constants';

export const registerActions = (
  core: CoreStart,
  plugins: StartPlugins,
  store: SecurityAppStore,
  services: StartServices,
  history: ScopedHistory<unknown>
) => {
  // registerEmbeddableActions(plugins.uiActions, store);
  registerUiActions(core, plugins, store, services, history);
};

const registerEmbeddableActions = (uiActions: UiActionsStart, store: SecurityAppStore) => {
  const addToTimelineAction = new AddToTimelineAction(store);
  uiActions.addTriggerAction(CELL_VALUE_TRIGGER, addToTimelineAction);

  const copyToClipboardAction = new CopyToClipboardAction();
  uiActions.addTriggerAction(CELL_VALUE_TRIGGER, copyToClipboardAction);
};

/**
 * Register UI Actions.
 */
const registerUiActions = (
  core: CoreStart,
  plugins: StartPlugins,
  store: SecurityAppStore,
  services: StartServices,
  history: ScopedHistory<unknown>
) => {
  const notificationService = core.notifications;
  const filterManager = plugins.data.query.filterManager;

  const filterInAction = createFilterInAction({
    filterManager,
    order: 1,
  });
  const filterOutAction = createFilterOutAction({
    filterManager,
    order: 2,
  });
  const addToTimeline = createAddToTimelineAction({ store, order: 3 });
  const showTopNAction = createShowTopNAction({ store, services, history, order: 4 });
  const copyAction = createCopyToClipboardAction({ notificationService, order: 5 });

  plugins.uiActions.registerTrigger({
    id: SECURITY_SOLUTION_ACTION_TRIGGER,
  });

  plugins.uiActions.addTriggerAction(SECURITY_SOLUTION_ACTION_TRIGGER, copyAction);
  plugins.uiActions.addTriggerAction(SECURITY_SOLUTION_ACTION_TRIGGER, filterInAction);
  plugins.uiActions.addTriggerAction(SECURITY_SOLUTION_ACTION_TRIGGER, filterOutAction);
  plugins.uiActions.addTriggerAction(SECURITY_SOLUTION_ACTION_TRIGGER, showTopNAction);
  plugins.uiActions.addTriggerAction(SECURITY_SOLUTION_ACTION_TRIGGER, addToTimeline);
};
