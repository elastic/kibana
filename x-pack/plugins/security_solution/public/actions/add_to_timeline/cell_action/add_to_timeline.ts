/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCellActionFactory } from '@kbn/cell-actions';
import type { CellActionTemplate } from '@kbn/cell-actions';
import type { CellActionField } from '@kbn/cell-actions/src/types';
import { isArray } from 'lodash/fp';
import { timelineActions } from '../../../timelines/store/timeline';
import type { Filter } from '../../../overview/components/detection_response/hooks/use_navigate_to_timeline';
import { getDataProviders } from '../../../overview/components/detection_response/hooks/use_navigate_to_timeline';
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
  ALERTS_COUNT,
} from '../constants';
import { createDataProviders, isValidDataProviderField } from '../data_provider';
import { SecurityCellActionType } from '../../constants';
import type { StartServices } from '../../../types';
import type { SecurityCellAction } from '../../types';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';

export const getToastMessage = (filters: Filter[], fieldValue?: CellActionField['value']) => {
  if (fieldValue == null) {
    return '';
  }
  if (isArray(fieldValue)) {
    return fieldValue.join(', ');
  }
  const descriptorFields = ['kibana.alert.severity', 'kibana.alert.workflow_status'];
  const alertDescriptors = ['acknowledged', 'closed', 'critical', 'high', 'low', 'medium', 'open'];

  const descriptors = filters.reduce(
    (msg, filter) =>
      !isArray(filter.value)
        ? descriptorFields.includes(filter.field) && alertDescriptors.includes(filter.value)
          ? msg.length === 0
            ? filter.value
            : `${msg}, ${filter.value}`
          : msg
        : '',
    ''
  );

  return ALERTS_COUNT(fieldValue, descriptors);
};

const handleAndFilters = (filters: Filter[], field: CellActionField, store: SecurityAppStore) => {
  const dataProviders = getDataProviders([
    [{ value: field.value ?? '', field: field.name }, ...filters],
  ]);

  // clear timeline to accurately get count
  store.dispatch(
    timelineActions.createTimeline({
      ...timelineDefaults,
      id: TimelineId.active,
    })
  );

  return {
    messageValue: getToastMessage(filters, field.value),
    dataProviders,
  };
};

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
      execute: async ({ field, metadata }) => {
        let messageValue = '';
        let dataProviders = [];
        if (metadata && metadata.andFilters) {
          const filters = handleAndFilters(metadata.andFilters, field, store);
          messageValue = filters.messageValue;
          dataProviders = filters.dataProviders;
        } else {
          dataProviders =
            createDataProviders({
              contextId: TimelineId.active,
              fieldType: field.type,
              values: field.value,
              field: field.name,
              negate: metadata?.negateFilters === true,
            }) ?? [];
          if (field.value != null) {
            messageValue = Array.isArray(field.value) ? field.value.join(', ') : field.value;
          }
        }

        if (dataProviders.length > 0) {
          store.dispatch(addProvider({ id: TimelineId.active, providers: dataProviders }));
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
