/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellAction } from '@kbn/cell-actions';
import { addProvider } from '../../../timelines/store/timeline/actions';
import { TimelineId } from '../../../../common/types';
import { KibanaServices } from '../../../common/lib/kibana';
import type { SecurityAppStore } from '../../../common/store';
import { fieldHasCellActions, isInSecurityApp } from '../../utils';
import {
  ADD_TO_TIMELINE,
  ADD_TO_TIMELINE_FAILED_TEXT,
  ADD_TO_TIMELINE_FAILED_TITLE,
  ADD_TO_TIMELINE_ICON,
  ADD_TO_TIMELINE_SUCCESS_TITLE,
} from '../constants';
import { createDataProviders } from '../data_provider';

export const ACTION_ID = 'security_addToTimeline';

export const createAddToTimelineAction = ({
  store,
  order,
}: {
  store: SecurityAppStore;
  order?: number;
}): CellAction => {
  const { application: applicationService, notifications: notificationsService } =
    KibanaServices.get();
  let currentAppId: string | undefined;
  applicationService.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  return {
    id: ACTION_ID,
    type: ACTION_ID,
    order,
    getIconType: (): string => ADD_TO_TIMELINE_ICON,
    getDisplayName: () => ADD_TO_TIMELINE,
    getDisplayNameTooltip: () => ADD_TO_TIMELINE,
    isCompatible: async ({ field }) =>
      isInSecurityApp(currentAppId) && fieldHasCellActions(field.name),
    execute: async ({ field, metadata }) => {
      const negate = Boolean(metadata?.negateFilters);
      const dataProviders =
        createDataProviders({
          contextId: TimelineId.active,
          fieldType: field.type,
          values: field.value,
          field: field.name,
          negate,
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
};
