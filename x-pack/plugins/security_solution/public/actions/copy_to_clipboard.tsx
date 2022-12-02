/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import copy from 'copy-to-clipboard';
import type { NotificationsStart } from '@kbn/core/public';

export const COPY_TO_CLIPBOARD = i18n.translate('xpack.securitySolution.actions.copyToClipboard', {
  defaultMessage: 'Copy to Clipboard',
});

export const SUCCESS_TOAST_TITLE = (field: string) =>
  i18n.translate('xpack.timelines.clipboard.copy.successToastTitle', {
    values: { field },
    defaultMessage: 'Copied field {field} to the clipboard',
  });
const ID = 'copy-to-clipboard';
const ICON = 'copyClipboard';

interface CopyActionContext {
  field: string;
  value: string;
}

export const createCopyToClipboardAction = (notificationService: NotificationsStart) =>
  createAction<CopyActionContext>({
    id: ID,
    type: ID,
    getIconType: (): string => ICON,
    getDisplayName: () => COPY_TO_CLIPBOARD,
    isCompatible: async ({ field, value }: CopyActionContext) => field != null && value != null,
    execute: async ({ field, value }: CopyActionContext) => {
      const text = `${field}${value != null ? `: "${value}"` : ''}`;
      const isSuccess = copy(text, { debug: true });

      if (isSuccess) {
        notificationService.toasts.addSuccess(
          {
            title: SUCCESS_TOAST_TITLE(field),
          },
          {
            toastLifeTimeMs: 800,
          }
        );
      }
    },
  });
