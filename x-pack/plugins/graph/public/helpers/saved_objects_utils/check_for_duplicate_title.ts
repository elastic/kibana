/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { ContentClient } from '@kbn/content-management-plugin/public';
import type { GraphWorkspaceSavedObject } from '../../types';
import { SAVE_DUPLICATE_REJECTED } from './constants';
import { findObjectByTitle } from './find_object_by_title';
import { displayDuplicateTitleConfirmModal } from './display_duplicate_title_confirm_modal';

/**
 * check for an existing VisSavedObject with the same title in ES
 * returns Promise<true> when it's no duplicate, or the modal displaying the warning
 * that's there's a duplicate is confirmed, else it returns a rejected Promise<ErrorMsg>
 * @param savedObject
 * @param isTitleDuplicateConfirmed
 * @param onTitleDuplicate
 * @param services
 */
export async function checkForDuplicateTitle(
  savedObject: Pick<GraphWorkspaceSavedObject, 'id' | 'title' | 'lastSavedTitle' | 'getEsType'>,
  isTitleDuplicateConfirmed: boolean,
  onTitleDuplicate: (() => void) | undefined,
  services: {
    contentClient: ContentClient;
  } & Pick<CoreStart, 'overlays' | 'analytics' | 'i18n' | 'theme'>
): Promise<boolean> {
  const { contentClient, ...startServices } = services;
  // Don't check for duplicates if user has already confirmed save with duplicate title
  if (isTitleDuplicateConfirmed) {
    return true;
  }

  // Don't check if the user isn't updating the title, otherwise that would become very annoying to have
  // to confirm the save every time, except when copyOnSave is true, then we do want to check.
  if (savedObject.title === savedObject.lastSavedTitle) {
    return true;
  }

  const duplicate = await findObjectByTitle(contentClient, savedObject.title);

  if (!duplicate || duplicate.id === savedObject.id) {
    return true;
  }

  if (onTitleDuplicate) {
    onTitleDuplicate();
    return Promise.reject(new Error(SAVE_DUPLICATE_REJECTED));
  }

  // TODO: make onTitleDuplicate a required prop and remove UI components from this class
  // Need to leave here until all users pass onTitleDuplicate.
  return displayDuplicateTitleConfirmModal(savedObject, startServices);
}
