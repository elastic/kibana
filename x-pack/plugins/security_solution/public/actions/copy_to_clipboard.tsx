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
import type { CellActionExecutionContext } from '@kbn/ui-actions-plugin/public/cell_actions/components/cell_actions';

export const COPY_TO_CLIPBOARD = i18n.translate('xpack.securitySolution.actions.copyToClipboard', {
  defaultMessage: 'Copy to Clipboard',
});

export const SUCCESS_TOAST_TITLE = (field: string) =>
  i18n.translate('xpack.securitySolution.clipboard.copy.successToastTitle', {
    values: { field },
    defaultMessage: 'Copied field {field} to the clipboard',
  });
const ID = 'security_copyToClipboard';
const ICON = 'copyClipboard';

export const createCopyToClipboardAction = ({
  notificationService,
  order,
}: {
  notificationService: NotificationsStart;
  order?: number;
}) =>
  createAction<CellActionExecutionContext>({
    id: ID,
    type: ID,
    order,
    getIconType: (): string => ICON,
    getDisplayName: () => COPY_TO_CLIPBOARD,
    getDisplayNameTooltip: () => COPY_TO_CLIPBOARD,
    isCompatible: async (context) => context.field.name != null && context.field.value != null,
    execute: async ({ field }) => {
      const text = `${field.name}${field.value != null ? `: "${field.value}"` : ''}`;
      const isSuccess = copy(text, { debug: true });

      if (isSuccess) {
        notificationService.toasts.addSuccess(
          {
            title: SUCCESS_TOAST_TITLE(field.name),
          },
          {
            toastLifeTimeMs: 800,
          }
        );
      }
    },
  });
