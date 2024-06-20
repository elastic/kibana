/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { StartServices } from '../../types';
import type { ConfirmModalSavedObjectMeta } from './types';
import { SAVE_DUPLICATE_REJECTED } from './constants';
import { confirmModalPromise } from './confirm_modal_promise';

export function displayDuplicateTitleConfirmModal(
  { title, displayName }: ConfirmModalSavedObjectMeta,
  startServices: StartServices
): Promise<boolean> {
  const confirmMessage = i18n.translate(
    'xpack.lens.confirmModal.saveDuplicateConfirmationMessage',
    {
      defaultMessage: `A {name} with the title ''{title}'' already exists. Would you like to save anyway?`,
      values: { title, name: displayName },
    }
  );

  const confirmButtonText = i18n.translate('xpack.lens.confirmModal.saveDuplicateButtonLabel', {
    defaultMessage: 'Save {name}',
    values: { name: displayName },
  });
  try {
    return confirmModalPromise(confirmMessage, '', confirmButtonText, startServices);
  } catch {
    return Promise.reject(new Error(SAVE_DUPLICATE_REJECTED));
  }
}
