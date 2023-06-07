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
import { createDataProviders, isValidDataProviderField } from '../data_provider';
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
      isCompatible: async ({ field }) =>
        fieldHasCellActions(field.name) && isValidDataProviderField(field.name, field.type),
      execute: async ({ field: { value, type, name }, metadata }) => {
        const values = Array.isArray(value) ? value : [value];
        const [firstValue, ...andValues] = values;
        const [dataProvider] =
          createDataProviders({
            contextId: TimelineId.active,
            fieldType: type,
            values: firstValue,
            field: name,
            negate: metadata?.negateFilters === true,
          }) ?? [];

        if (dataProvider) {
          andValues.forEach((andValue) => {
            const [andDataProvider] =
              createDataProviders({
                contextId: TimelineId.active,
                fieldType: type,
                values: andValue,
                field: name,
                negate: metadata?.negateFilters === true,
              }) ?? [];
            if (andDataProvider) {
              dataProvider.and.push(andDataProvider);
            }
          });
        }

        if (dataProvider) {
          store.dispatch(addProvider({ id: TimelineId.active, providers: [dataProvider] }));

          let messageValue = '';
          if (value != null) {
            messageValue = Array.isArray(value) ? value.join(', ') : value;
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
