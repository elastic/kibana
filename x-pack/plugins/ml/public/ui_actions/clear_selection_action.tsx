/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ActionContextMapping, createAction } from '../../../../../src/plugins/ui_actions/public';
import { MlCoreSetup } from '../plugin';

export const CLEAR_SELECTION_ACTION = 'clearSelectionAction';

export interface ClearSelectionContext {
  updateCallback: () => void;
}

export function createClearSelectionAction(getStartServices: MlCoreSetup['getStartServices']) {
  return createAction<typeof CLEAR_SELECTION_ACTION>({
    id: 'clear-selection-action',
    type: CLEAR_SELECTION_ACTION,
    getIconType(context: ActionContextMapping[typeof CLEAR_SELECTION_ACTION]): string {
      return 'cross';
    },
    getDisplayName: () =>
      i18n.translate('xpack.ml.actions.clearSelectionTitle', {
        defaultMessage: 'Clear selection',
      }),
    shouldAutoExecute: () => Promise.resolve(false),
    async execute({ updateCallback }: ClearSelectionContext) {
      updateCallback();
    },
    async isCompatible({ updateCallback }: ClearSelectionContext) {
      return typeof updateCallback === 'function';
    },
  });
}
