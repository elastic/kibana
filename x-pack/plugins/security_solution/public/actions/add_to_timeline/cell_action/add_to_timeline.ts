/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCellActionFactory } from '@kbn/cell-actions';
import type { CellActionTemplate } from '@kbn/cell-actions';
import {
  isTypeSupportedByDefaultActions,
  isValueSupportedByDefaultActions,
  filterOutNullableValues,
  valueToArray,
} from '@kbn/cell-actions/src/actions/utils';
import { ACTION_INCOMPATIBLE_VALUE_WARNING } from '@kbn/cell-actions/src/actions/translations';
import type { KBN_FIELD_TYPES } from '@kbn/field-types';
import { addProvider } from '../../../timelines/store/actions';
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
      isCompatible: async ({ data }) => {
        const field = data[0]?.field;

        return (
          data.length === 1 && // TODO Add support for multiple values
          fieldHasCellActions(field.name) &&
          isValidDataProviderField(field.name, field.type) &&
          isTypeSupportedByDefaultActions(field.type as KBN_FIELD_TYPES)
        );
      },

      execute: async ({ data, metadata }) => {
        const { name, type } = data[0]?.field;
        const rawValue = data[0]?.value;
        const value = filterOutNullableValues(valueToArray(rawValue));

        if (!isValueSupportedByDefaultActions(value)) {
          notificationsService.toasts.addWarning({
            title: ACTION_INCOMPATIBLE_VALUE_WARNING,
          });
          return;
        }

        const [firstValue, ...andValues] = value;
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

          const messageValue = value.join(', ');
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
