/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCellActionFactory } from '@kbn/cell-actions';
import type { CellActionTemplate } from '@kbn/cell-actions';
import type { CellActionField } from '@kbn/cell-actions/src/types';
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
  SEVERITY_ALERTS,
} from '../constants';
import { createDataProviders, isValidDataProviderField } from '../data_provider';
import { SecurityCellActionType } from '../../constants';
import type { StartServices } from '../../../types';
import type { SecurityCellAction } from '../../types';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';

const handleTimelineFilters = (
  filters: Filter[],
  field: CellActionField,
  store: SecurityAppStore
) => {
  const severityValue = null;
  const dataProviders = getDataProviders([
    [{ value: field.value ?? '*', field: field.name }, ...filters],
  ]);

  // clear timeline to accurately get count
  store.dispatch(
    timelineActions.createTimeline({
      ...timelineDefaults,
      id: TimelineId.active,
    })
  );

  let messageValue;
  if (
    field.value != null &&
    (severityValue === 'critical' ||
      severityValue === 'medium' ||
      severityValue === 'low' ||
      severityValue === 'high' ||
      severityValue === '*')
  ) {
    messageValue = SEVERITY_ALERTS(
      Array.isArray(field.value) ? field.value.join(', ') : field.value,
      severityValue
    );
  }
  return {
    messageValue,
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
        if (metadata && metadata.timelineFilter != null) {
          // @ts-expect-error
          const filters = handleTimelineFilters(metadata.timelineFilter, field, store);
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
