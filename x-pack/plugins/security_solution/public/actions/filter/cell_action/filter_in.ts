/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addFilterIn, addFilterOut, createFilterInActionFactory } from '@kbn/cell-actions';
import {
  isTypeSupportedByDefaultActions,
  isValueSupportedByDefaultActions,
  valueToArray,
  filterOutNullableValues,
} from '@kbn/cell-actions/src/actions/utils';
import type { KBN_FIELD_TYPES } from '@kbn/field-types';
import { ACTION_INCOMPATIBLE_VALUE_WARNING } from '@kbn/cell-actions/src/actions/translations';
import type { SecurityAppStore } from '../../../common/store';
import { timelineSelectors } from '../../../timelines/store';
import { fieldHasCellActions } from '../../utils';
import { TimelineId } from '../../../../common/types';
import { isTimelineScope } from '../../../helpers';
import { SecurityCellActionType } from '../../constants';
import type { StartServices } from '../../../types';
import type { SecurityCellAction } from '../../types';

export const createFilterInCellActionFactory = ({
  store,
  services,
}: {
  store: SecurityAppStore;
  services: StartServices;
}) => {
  const getTimelineById = timelineSelectors.getTimelineByIdSelector();

  const { filterManager } = services.data.query;
  const { notifications } = services;
  const genericFilterInActionFactory = createFilterInActionFactory({
    filterManager,
    notifications,
  });

  return genericFilterInActionFactory.combine<SecurityCellAction>({
    type: SecurityCellActionType.FILTER,
    isCompatible: async ({ data }) => {
      const field = data[0]?.field;

      return (
        data.length === 1 && // TODO Add support for multiple values
        fieldHasCellActions(field.name) &&
        isTypeSupportedByDefaultActions(field.type as KBN_FIELD_TYPES)
      );
    },
    execute: async ({ data, metadata }) => {
      const field = data[0]?.field;
      const rawValue = data[0]?.value;
      const value = filterOutNullableValues(valueToArray(rawValue));

      if (!isValueSupportedByDefaultActions(value)) {
        notifications.toasts.addWarning({
          title: ACTION_INCOMPATIBLE_VALUE_WARNING,
        });
        return;
      }

      if (!field) return;

      // if negateFilters is true we have to perform the opposite operation, we can just execute filterOut with the same params
      const addFilter = metadata?.negateFilters === true ? addFilterOut : addFilterIn;

      if (metadata?.scopeId && isTimelineScope(metadata.scopeId)) {
        const timelineFilterManager = getTimelineById(
          store.getState(),
          TimelineId.active
        )?.filterManager;

        addFilter({
          filterManager: timelineFilterManager,
          fieldName: field.name,
          value,
        });
      } else {
        addFilter({
          filterManager,
          fieldName: field.name,
          value,
        });
      }
    },
  });
};
