/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiHasAppContext } from '@kbn/presentation-publishing';
import { APP_ID, getEditPath, getFullPath, MAP_EMBEDDABLE_NAME } from '../../common/constants';
import { getEmbeddableService, getHttp, getMapsCapabilities } from '../kibana_services';
import { MapSerializedState } from './types';

export function initializeEditApi(
  uuid: string,
  getState: () => MapSerializedState,
  parentApi?: unknown,
  savedObjectId?: string
) {
  return !parentApi || !apiHasAppContext(parentApi)
    ? {}
    : {
        getTypeDisplayName: () => {
          return MAP_EMBEDDABLE_NAME;
        },
        onEdit: async () => {
          const parentApiContext = parentApi.getAppContext();
          const stateTransfer = getEmbeddableService().getStateTransfer();
          await stateTransfer.navigateToEditor(APP_ID, {
            path: getEditPath(savedObjectId),
            state: {
              embeddableId: uuid,
              valueInput: getState(),
              originatingApp: parentApiContext.currentAppId,
              originatingPath: parentApiContext.getCurrentPath?.(),
            },
          });
        },
        isEditingEnabled: () => {
          return getMapsCapabilities().save as boolean;
        },
        getEditHref: async () => {
          return getHttp().basePath.prepend(getFullPath(savedObjectId));
        },
      };
}
