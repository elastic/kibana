/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCellActionFactory } from '@kbn/cell-actions';
import type { CellActionTemplate } from '@kbn/cell-actions';
import { addProvider } from '../../../timelines/store/timeline/actions';
import { TimelineId } from '../../../../common/types';
import type { SecurityAppStore } from '../../../common/store';
import { fieldHasCellActions } from '../../utils';
import {
  ADD_TO_TIMELINE,
  ADD_TO_TIMELINE_FAILED_TEXT,
  ADD_TO_TIMELINE_FAILED_TITLE,
  ADD_TO_TIMELINE_ICON,
  ADD_TO_TIMELINE_SUCCESS_TITLE,
} from '../constants';
import { createDataProviders } from '../data_provider';
import { SecurityCellActionType } from '../../constants';
import type { StartServices } from '../../../types';
import type { SecurityCellAction } from '../../types';

export const createAddToTimelineCellActionFactory = createCellActionFactory(
  ({
    store,
    services,
  }: {
    store: SecurityAppStore;
    services: StartServices;
  }): CellActionTemplate<SecurityCellAction> => {
    const { notifications: notificationsService } = services;

    return {
      type: SecurityCellActionType.ADD_TO_TIMELINE,
      getIconType: () => ADD_TO_TIMELINE_ICON,
      getDisplayName: () => ADD_TO_TIMELINE,
      getDisplayNameTooltip: () => ADD_TO_TIMELINE,
      isCompatible: async ({ field }) => fieldHasCellActions(field.name),
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
          notificationsService.toasts.addSuccess({
            title: ADD_TO_TIMELINE_SUCCESS_TITLE(messageValue),
          });
        } else {
          notificationsService.toasts.addWarning({
            title: ADD_TO_TIMELINE_FAILED_TITLE,
            text: ADD_TO_TIMELINE_FAILED_TEXT,
          });
        }
      },
    };
  }
);
