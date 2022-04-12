/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Datatable } from '@kbn/expressions-plugin';
import type { Trigger } from '@kbn/ui-actions-plugin/public';

export const ROW_CLICK_TRIGGER = 'ROW_CLICK_TRIGGER';

export const rowClickTrigger: Trigger = {
  id: ROW_CLICK_TRIGGER,
  title: i18n.translate('uiActions.triggers.rowClickTitle', {
    defaultMessage: 'Table row click',
  }),
  description: i18n.translate('uiActions.triggers.rowClickkDescription', {
    defaultMessage: 'A click on a table row',
  }),
};

export interface RowClickContext {
  // Need to make this unknown to prevent circular dependencies.
  // Apps using this property will need to cast to `IEmbeddable`.
  embeddable?: unknown;
  data: {
    /**
     * Row index, starting from 0, where user clicked.
     */
    rowIndex: number;

    table: Datatable;

    /**
     * Sorted list column IDs that were visible to the user. Useful when only
     * a subset of datatable columns should be used.
     */
    columns?: string[];
  };
}

export function isRowClickTriggerContext(context: unknown): context is RowClickContext {
  return (
    !!(context as Record<string, unknown> | undefined)?.data &&
    typeof (context as Record<string, unknown>)?.data === 'object' &&
    typeof (context as RowClickContext).data.rowIndex === 'number'
  );
}
