/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellValueContext, IEmbeddable } from '@kbn/embeddable-plugin/public';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import copy from 'copy-to-clipboard';
import { KibanaServices } from '../../../common/lib/kibana';
import { fieldHasCellActions, isCountField, isInSecurityApp, isLensEmbeddable } from '../../utils';
import { COPY_TO_CLIPBOARD, COPY_TO_CLIPBOARD_ICON, COPY_TO_CLIPBOARD_SUCCESS } from '../constants';

export const ACTION_ID = 'embeddable_copyToClipboard';

function isDataColumnsValid(data?: CellValueContext['data']): boolean {
  return (
    !!data &&
    data.length > 0 &&
    data.every(({ columnMeta }) => columnMeta && fieldHasCellActions(columnMeta.field))
  );
}

export const createCopyToClipboardLensAction = ({ order }: { order?: number }) => {
  const { application: applicationService } = KibanaServices.get();
  let currentAppId: string | undefined;
  applicationService.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  return createAction<CellValueContext>({
    id: ACTION_ID,
    type: ACTION_ID,
    order,
    getIconType: () => COPY_TO_CLIPBOARD_ICON,
    getDisplayName: () => COPY_TO_CLIPBOARD,
    isCompatible: async ({ embeddable, data }) =>
      !isErrorEmbeddable(embeddable as IEmbeddable) &&
      isLensEmbeddable(embeddable as IEmbeddable) &&
      isDataColumnsValid(data) &&
      isInSecurityApp(currentAppId),
    execute: async ({ data }) => {
      const {
        notifications: { toasts: toastsService },
      } = KibanaServices.get();

      const text = data
        .map(({ columnMeta, value }) => {
          if (isCountField(columnMeta?.type, columnMeta?.sourceParams?.type)) {
            return `${columnMeta?.field}: *`;
          }
          return `${columnMeta?.field}${value != null ? `: "${value}"` : ''}`;
        })
        .join(' | ');

      const isSuccess = copy(text, { debug: true });

      if (isSuccess) {
        toastsService.addSuccess({
          title: COPY_TO_CLIPBOARD_SUCCESS,
          toastLifeTimeMs: 800,
        });
      }
    },
  });
};
