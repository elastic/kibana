/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellActionExecutionContext } from '@kbn/cell-actions';
import copy from 'copy-to-clipboard';
import { createAction } from '@kbn/ui-actions-plugin/public';
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

      let textValue: undefined | string;
      if (field.value != null) {
        textValue = Array.isArray(field.value)
          ? field.value.map((value) => `"${value}"`).join(', ')
          : `"${field.value}"`;
      }
      const text = textValue ? `${field.name}: ${textValue}` : field.name;

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
