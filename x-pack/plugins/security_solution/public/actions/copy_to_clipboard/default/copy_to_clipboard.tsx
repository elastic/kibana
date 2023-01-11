/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from '@kbn/ui-actions-plugin/public';
import copy from 'copy-to-clipboard';
import type { CellActionExecutionContext } from '@kbn/ui-actions-plugin/public/cell_actions/components/cell_actions';
import { COPY_TO_CLIPBOARD, COPY_TO_CLIPBOARD_ICON, COPY_TO_CLIPBOARD_SUCCESS } from '../constants';
import { KibanaServices } from '../../../common/lib/kibana';

const ID = 'security_copyToClipboard';

export const createCopyToClipboardAction = ({ order }: { order?: number }) =>
  createAction<CellActionExecutionContext>({
    id: ID,
    type: ID,
    order,
    getIconType: (): string => COPY_TO_CLIPBOARD_ICON,
    getDisplayName: () => COPY_TO_CLIPBOARD,
    getDisplayNameTooltip: () => COPY_TO_CLIPBOARD,
    isCompatible: async (context) => context.field.name != null && context.field.value != null,
    execute: async ({ field }) => {
      const { notifications } = KibanaServices.get();
      const text = `${field.name}: "${field.value}"`;
      const isSuccess = copy(text, { debug: true });

      if (isSuccess) {
        notifications.toasts.addSuccess(
          {
            title: COPY_TO_CLIPBOARD_SUCCESS,
          },
          {
            toastLifeTimeMs: 800,
          }
        );
      }
    },
  });
