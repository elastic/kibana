/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCellActionFactory, type CellActionTemplate } from '@kbn/cell-actions';
import { timelineActions } from '../../../timelines/store/timeline';
import { addProvider } from '../../../timelines/store/timeline/actions';
import type { DataProvider } from '../../../../common/types';
import { TimelineId } from '../../../../common/types';
import type { SecurityAppStore } from '../../../common/store';
import { fieldHasCellActions } from '../../utils';
import {
  ADD_TO_NEW_TIMELINE,
  ADD_TO_TIMELINE_FAILED_TEXT,
  ADD_TO_TIMELINE_FAILED_TITLE,
  ADD_TO_TIMELINE_ICON,
  ADD_TO_TIMELINE_SUCCESS_TITLE,
  ALERTS_COUNT,
  SEVERITY,
} from '../constants';
import { createDataProviders, isValidDataProviderField } from '../data_provider';
import { SecurityCellActionType } from '../../constants';
import type { StartServices } from '../../../types';
import type { SecurityCellAction } from '../../types';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';

const severityField = 'kibana.alert.severity';
const statusField = 'kibana.alert.workflow_status';

export const getToastMessage = ({ queryMatch: { value }, and = [] }: DataProvider) => {
  if (value == null) {
    return '';
  }
  const fieldValue = Array.isArray(value) ? value.join(', ') : value.toString();

  const descriptors = and.reduce<string[]>((msg, { queryMatch }) => {
    if (Array.isArray(queryMatch.value)) {
      return msg;
    }
    if (queryMatch.field === severityField) {
      msg.push(SEVERITY(queryMatch.value.toString()));
    }
    if (queryMatch.field === statusField) {
      msg.push(queryMatch.value.toString());
    }
    return msg;
  }, []);

  return ALERTS_COUNT(fieldValue, descriptors.join(', '));
};

export const createAddToNewTimelineCellActionFactory = createCellActionFactory(
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
      getDisplayName: () => ADD_TO_NEW_TIMELINE,
      getDisplayNameTooltip: () => ADD_TO_NEW_TIMELINE,
      isCompatible: async ({ field }) =>
        fieldHasCellActions(field.name) && isValidDataProviderField(field.name, field.type),
      execute: async ({ field, metadata }) => {
        const dataProviders =
          createDataProviders({
            contextId: TimelineId.active,
            fieldType: field.type,
            values: field.value,
            field: field.name,
            negate: metadata?.negateFilters === true,
          }) ?? [];

        for (const andFilter of metadata?.andFilters ?? []) {
          const andDataProviders =
            createDataProviders({
              contextId: TimelineId.active,
              field: andFilter.field,
              values: andFilter.value,
            }) ?? [];
          if (andDataProviders) {
            for (const dataProvider of dataProviders) {
              dataProvider.and.push(...andDataProviders);
            }
          }
        }

        if (dataProviders.length > 0) {
          // clear timeline
          store.dispatch(
            timelineActions.createTimeline({
              ...timelineDefaults,
              id: TimelineId.active,
            })
          );
          store.dispatch(addProvider({ id: TimelineId.active, providers: dataProviders }));
          notificationsService.toasts.addSuccess({
            title: ADD_TO_TIMELINE_SUCCESS_TITLE(getToastMessage(dataProviders[0])),
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
