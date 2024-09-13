/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { GraphWorkspaceSavedObject } from '../../types';
import { SAVE_DUPLICATE_REJECTED } from './constants';
import { confirmModalPromise } from './confirm_modal_promise';

export function displayDuplicateTitleConfirmModal(
  savedObject: Pick<GraphWorkspaceSavedObject, 'title'>,
  startServices: Pick<CoreStart, 'overlays' | 'analytics' | 'i18n' | 'theme'>
): Promise<boolean> {
  const confirmTitle = i18n.translate('xpack.graph.confirmModal.saveDuplicateConfirmationTitle', {
    defaultMessage: `This visualization already exists`,
  });

  const confirmMessage = i18n.translate(
    'xpack.graph.confirmModal.saveDuplicateConfirmationMessage',
    {
      defaultMessage: `Saving "{name}" creates a duplicate title. Would you like to save anyway?`,
      values: { name: savedObject.title },
    }
  );

  const confirmButtonText = i18n.translate('xpack.graph.confirmModal.saveDuplicateButtonLabel', {
    defaultMessage: 'Save',
  });

  try {
    return confirmModalPromise(confirmMessage, confirmTitle, confirmButtonText, startServices);
  } catch {
    return Promise.reject(new Error(SAVE_DUPLICATE_REJECTED));
  }
}
