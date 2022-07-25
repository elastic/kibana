/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { MlCoreSetup } from '../plugin';

export const CLEAR_SELECTION_ACTION = 'clearSelectionAction';

export interface ClearSelectionContext {
  updateCallback: () => void;
}

export function createClearSelectionAction(getStartServices: MlCoreSetup['getStartServices']) {
  return createAction<ClearSelectionContext>({
    id: 'clear-selection-action',
    type: CLEAR_SELECTION_ACTION,
    getIconType(context): string {
      return 'cross';
    },
    getDisplayName: () =>
      i18n.translate('xpack.ml.actions.clearSelectionTitle', {
        defaultMessage: 'Clear selection',
      }),
    shouldAutoExecute: () => Promise.resolve(false),
    async execute({ updateCallback }) {
      updateCallback();
    },
    async isCompatible({ updateCallback }) {
      return typeof updateCallback === 'function';
    },
  });
}
