/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CELL_VALUE_TRIGGER } from '@kbn/embeddable-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { SecurityAppStore } from '../common/store/types';
import { AddToTimelineAction } from './add_to_timeline';
import { CopyToClipboardAction } from './copy_to_clipboard';

export const registerActions = (uiActions: UiActionsStart, store: SecurityAppStore) => {
  const addToTimelineAction = new AddToTimelineAction(store);
  uiActions.addTriggerAction(CELL_VALUE_TRIGGER, addToTimelineAction);

  const copyToClipboardAction = new CopyToClipboardAction();
  uiActions.addTriggerAction(CELL_VALUE_TRIGGER, copyToClipboardAction);
};
