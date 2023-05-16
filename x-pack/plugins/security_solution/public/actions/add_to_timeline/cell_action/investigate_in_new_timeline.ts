/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCellActionFactory, type CellActionTemplate } from '@kbn/cell-actions';
import { timelineActions } from '../../../timelines/store/timeline';
import { addProvider, showTimeline } from '../../../timelines/store/timeline/actions';
import { TimelineId } from '../../../../common/types';
import type { SecurityAppStore } from '../../../common/store';
import { fieldHasCellActions } from '../../utils';
import {
  ADD_TO_TIMELINE_FAILED_TEXT,
  ADD_TO_TIMELINE_FAILED_TITLE,
  ADD_TO_TIMELINE_ICON,
  INVESTIGATE_IN_TIMELINE,
} from '../constants';
import { createDataProviders, isValidDataProviderField } from '../data_provider';
import { SecurityCellActionType } from '../../constants';
import type { StartServices } from '../../../types';
import type { SecurityCellAction } from '../../types';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';

export const createInvestigateInNewTimelineCellActionFactory = createCellActionFactory(
  ({
    store,
    services,
  }: {
    store: SecurityAppStore;
    services: StartServices;
  }): CellActionTemplate<SecurityCellAction> => {
    const { notifications: notificationsService } = services;

    return {
      type: SecurityCellActionType.INVESTIGATE_IN_NEW_TIMELINE,
      getIconType: () => ADD_TO_TIMELINE_ICON,
      getDisplayName: () => INVESTIGATE_IN_TIMELINE,
      getDisplayNameTooltip: () => INVESTIGATE_IN_TIMELINE,
      isCompatible: async ({ field }) =>
        fieldHasCellActions(field.name) && isValidDataProviderField(field.name, field.type),
      execute: async ({ field, value, metadata }) => {
        const dataProviders =
          createDataProviders({
            contextId: TimelineId.active,
            fieldType: field.type,
            values: value,
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
          store.dispatch(showTimeline({ id: TimelineId.active, show: true }));

          store.dispatch(addProvider({ id: TimelineId.active, providers: dataProviders }));
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
