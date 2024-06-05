/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiHasAppContext, apiPublishesViewMode } from '@kbn/presentation-publishing';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { BehaviorSubject } from 'rxjs';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { noop } from 'lodash';
import { APP_ID, getEditPath } from '../../common/constants';
import { LensSerializedState } from './types';
import { LensEmbeddableStartServices } from './lens_embeddable';

export function initializeEditApi(
  uuid: string,
  getState: () => LensSerializedState,
  isTextBasedLanguage: (currentState: LensSerializedState) => boolean,
  { data, embeddable, capabilities, uiSettings }: LensEmbeddableStartServices,
  parentApi?: unknown,
  savedObjectId?: string
) {
  if (!parentApi || !apiHasAppContext(parentApi)) {
    return { api: {}, comparators: {}, attributes: {}, cleanup: noop };
  }

  const viewMode$ = apiPublishesViewMode(parentApi)
    ? parentApi.viewMode
    : new BehaviorSubject(ViewMode.VIEW);
  const parentApiContext = parentApi.getAppContext();
  return {
    comparators: {},
    attributes: {},
    cleanup: noop,
    api: {
      onEdit: async () => {
        const stateTransfer = embeddable.getStateTransfer();
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
        if (viewMode$.getValue() !== ViewMode.EDIT) {
          return false;
        }
        // if ESQL check one it is in TextBased mode &&
        if (isTextBasedLanguage(getState()) && !uiSettings.get(ENABLE_ESQL)) {
          return false;
        }
        return (
          Boolean(capabilities.visualize.save) ||
          (!getState().savedObjectId &&
            Boolean(capabilities.dashboard?.showWriteControls) &&
            Boolean(capabilities.visualize.show))
        );
      },
      getEditHref: async () => {
        const currentState = getState();
        return getEditPath(
          savedObjectId,
          currentState.timeRange,
          currentState.filters,
          data.query.timefilter.timefilter.getRefreshInterval()
        );
      },
    },
  };
}
