/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellValueContext } from '@kbn/embeddable-plugin/public';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import type { Action } from '@kbn/ui-actions-plugin/public';
import copy from 'copy-to-clipboard';
import { KibanaServices } from '../../../common/lib/kibana';
import { fieldHasCellActions, isInSecurityApp, isLensEmbeddable } from '../../utils';
import { COPY_TO_CLIPBOARD, COPY_TO_CLIPBOARD_ICON, COPY_TO_CLIPBOARD_SUCCESS } from '../constants';

export const ACTION_ID = 'embeddable_copyToClipboard';

function isDataColumnsValid(data?: CellValueContext['data']): boolean {
  return (
    !!data &&
    data.length > 0 &&
    data.every(({ columnMeta }) => columnMeta && fieldHasCellActions(columnMeta.field))
  );
}

export class LensCopyToClipboardAction implements Action<CellValueContext> {
  public readonly type = ACTION_ID;
  public readonly id = ACTION_ID;
  public order = 2;

  private toastsService;
  private currentAppId: string | undefined;

  constructor() {
    const { application, notifications } = KibanaServices.get();
    this.toastsService = notifications.toasts;

    application.currentAppId$.subscribe((currentAppId) => {
      this.currentAppId = currentAppId;
    });
  }

  public getDisplayName() {
    return COPY_TO_CLIPBOARD;
  }

  public getIconType() {
    return COPY_TO_CLIPBOARD_ICON;
  }

  public async isCompatible({ embeddable, data }: CellValueContext) {
    return (
      !isErrorEmbeddable(embeddable) &&
      isLensEmbeddable(embeddable) &&
      isDataColumnsValid(data) &&
      isInSecurityApp(this.currentAppId)
    );
  }

  public async execute({ data }: CellValueContext) {
    const text = data
      .map(({ columnMeta, value }) => `${columnMeta?.field}${value != null ? `: "${value}"` : ''}`)
      .join(' | ');

    const isSuccess = copy(text, { debug: true });

    if (isSuccess) {
      this.toastsService.addSuccess({
        title: COPY_TO_CLIPBOARD_SUCCESS,
        toastLifeTimeMs: 800,
      });
    }
  }
}
