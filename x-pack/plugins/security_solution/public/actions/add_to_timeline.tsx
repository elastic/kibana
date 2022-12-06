/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ApplicationStart } from '@kbn/core/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { addProvider } from '../timelines/store/timeline/actions';
import { APP_UI_ID } from '../../common/constants';
import { TimelineId } from '../../common/types';
import type { SecurityAppStore } from '../plugin';
import { createDataProviders } from './utils/dataprovider';
import { KibanaServices } from '../common/lib/kibana';
import type { ActionContext } from './types';

export const ACTION_ID = 'addToTimeline';
const ICON = 'timeline';

const ADD_TO_TIMELINE = i18n.translate(
  'xpack.securitySolution.actions.cellValue.addToTimeline.displayName',
  {
    defaultMessage: 'Add to timeline',
  }
);

export const createAddToTimelineAction = ({
  store,
  order,
}: {
  store: SecurityAppStore;
  order?: number;
}) => {
  const { application: applicationService, notifications: notificationsService } =
    KibanaServices.get();

  return createAction<ActionContext>({
    id: ACTION_ID,
    type: ACTION_ID,
    order,
    getIconType: (): string => ICON,
    getDisplayName: () => ADD_TO_TIMELINE,
    isCompatible: async () => isInSecurityApp(applicationService),
    execute: async (context: ActionContext) => {
      const dataProviders =
        createDataProviders({
          contextId: TimelineId.active,
          fieldType: context.fieldType,
          values: context.value,
          field: context.field,
        }) ?? [];

      if (dataProviders.length > 0) {
        store.dispatch(addProvider({ id: TimelineId.active, providers: dataProviders }));

        notificationsService.toasts.addSuccess({
          title: i18n.translate('xpack.securitySolution.actions.addToTimeline.addedFieldMessage', {
            values: { fieldOrValue: context.value },
            defaultMessage: `Added {fieldOrValue} to timeline`,
          }),
        });
      } else {
        notificationsService.toasts.addWarning({
          title: i18n.translate(
            'xpack.securitySolution.actions.cellValue.addToTimeline.warningTitle',
            { defaultMessage: 'Unable to add to timeline' }
          ),
          text: i18n.translate(
            'xpack.securitySolution.actions.cellValue.addToTimeline.warningMessage',
            { defaultMessage: 'Filter received is empty or can not be added to timeline' }
          ),
        });
      }
    },
  });
};

export const isInSecurityApp = async (applicationService: ApplicationStart): Promise<boolean> => {
  const currentAppId = await new Promise((resolve) => {
    applicationService.currentAppId$.subscribe(resolve).unsubscribe();
  });
  return currentAppId === APP_UI_ID;
};
