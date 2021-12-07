/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { OverlayStart } from 'kibana/public';
import type { SavedObject } from 'src/plugins/saved_objects/public';
import { SAVE_DUPLICATE_REJECTED } from './constants';
import { confirmModalPromise } from './confirm_modal_promise';

export function displayDuplicateTitleConfirmModal(
  savedObject: Pick<SavedObject, 'title' | 'getDisplayName'>,
  overlays: OverlayStart
): Promise<true> {
  const confirmMessage = i18n.translate(
    'xpack.lens.confirmModal.saveDuplicateConfirmationMessage',
    {
      defaultMessage: `A {name} with the title '{title}' already exists. Would you like to save anyway?`,
      values: { title: savedObject.title, name: savedObject.getDisplayName() },
    }
  );

  const confirmButtonText = i18n.translate('xpack.lens.confirmModal.saveDuplicateButtonLabel', {
    defaultMessage: 'Save {name}',
    values: { name: savedObject.getDisplayName() },
  });
  try {
    return confirmModalPromise(confirmMessage, '', confirmButtonText, overlays);
  } catch {
    return Promise.reject(new Error(SAVE_DUPLICATE_REJECTED));
  }
}
