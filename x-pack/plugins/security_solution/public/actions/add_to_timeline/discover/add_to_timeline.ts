/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CellAction, createCellActionFactory } from '@kbn/cell-actions';
import type { CellActionTemplate } from '@kbn/cell-actions';
import { addProvider } from '../../../timelines/store/timeline/actions';
import { TimelineId } from '../../../../common/types';
import type { SecurityAppStore } from '../../../common/store';
import { fieldHasCellActions, isInSecurityApp } from '../../utils';
import {
  ADD_TO_TIMELINE,
  ADD_TO_TIMELINE_FAILED_TEXT,
  ADD_TO_TIMELINE_FAILED_TITLE,
  ADD_TO_TIMELINE_ICON,
  ADD_TO_TIMELINE_SUCCESS_TITLE,
} from '../constants';
import { createDataProviders, isValidDataProviderField } from '../data_provider';
import { SecurityCellActionType } from '../../constants';
import type { StartServices } from '../../../types';

export const createAddToTimelineDiscoverCellActionFactory = createCellActionFactory(
  ({
    store,
    services,
  }: {
    store: SecurityAppStore;
    services: StartServices;
  }): CellActionTemplate<CellAction> => {
    const { notifications, application } = services;

    let currentAppId: string | undefined;
    application.currentAppId$.subscribe((appId) => {
      currentAppId = appId;
    });

    return {
      type: SecurityCellActionType.ADD_TO_TIMELINE,
      getIconType: () => ADD_TO_TIMELINE_ICON,
      getDisplayName: () => ADD_TO_TIMELINE,
      getDisplayNameTooltip: () => ADD_TO_TIMELINE,
      isCompatible: async ({ field }) =>
        isInSecurityApp(currentAppId) &&
        fieldHasCellActions(field.name) &&
        isValidDataProviderField(field.name, field.type),
      execute: async ({ field, metadata }) => {
        const dataProviders =
          createDataProviders({
            contextId: TimelineId.active,
            fieldType: field.type,
            values: field.value,
            field: field.name,
            negate: metadata?.negateFilters === true,
          }) ?? [];

        if (dataProviders.length > 0) {
          store.dispatch(addProvider({ id: TimelineId.active, providers: dataProviders }));

          let messageValue = '';
          if (field.value != null) {
            messageValue = Array.isArray(field.value) ? field.value.join(', ') : field.value;
          }
          notifications.toasts.addSuccess({
            title: ADD_TO_TIMELINE_SUCCESS_TITLE(messageValue),
          });
        } else {
          notifications.toasts.addWarning({
            title: ADD_TO_TIMELINE_FAILED_TITLE,
            text: ADD_TO_TIMELINE_FAILED_TEXT,
          });
        }
      },
    };
  }
);
