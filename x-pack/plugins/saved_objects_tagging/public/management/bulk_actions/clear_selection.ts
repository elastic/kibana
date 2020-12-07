/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { TagBulkAction } from '../types';

interface GetClearSelectionActionOptions {
  clearSelection: () => void;
}

export const getClearSelectionAction = ({
  clearSelection,
}: GetClearSelectionActionOptions): TagBulkAction => {
  return {
    id: 'clear_selection',
    label: i18n.translate('xpack.savedObjectsTagging.management.actions.clearSelection.label', {
      defaultMessage: 'Clear selection',
    }),
    icon: 'cross',
    refreshAfterExecute: true,
    execute: async () => {
      clearSelection();
    },
  };
};
