/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellValueContext } from '@kbn/embeddable-plugin/public';
import { isErrorEmbeddable, isFilterableEmbeddable } from '@kbn/embeddable-plugin/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { KibanaServices } from '../../../common/lib/kibana';
import type { SecurityAppStore } from '../../../common/store/types';
import { addProvider, showTimeline } from '../../../timelines/store/timeline/actions';
import type { DataProvider } from '../../../../common/types';
import { TimelineId } from '../../../../common/types';
import { fieldHasCellActions, isInSecurityApp, isLensEmbeddable } from '../../utils';
import {
  ADD_TO_TIMELINE,
  ADD_TO_TIMELINE_FAILED_TEXT,
  ADD_TO_TIMELINE_FAILED_TITLE,
  ADD_TO_TIMELINE_ICON,
} from '../constants';
import { createDataProviders } from '../data_provider';

export const ACTION_ID = 'embeddable_addToTimeline';

function isDataColumnsFilterable(data?: CellValueContext['data']): boolean {
  return (
    !!data &&
    data.length > 0 &&
    data.every(
      ({ columnMeta }) =>
        columnMeta &&
        fieldHasCellActions(columnMeta.field) &&
        columnMeta.source === 'esaggs' &&
        columnMeta.sourceParams?.indexPatternId
    )
  );
}

export const createAddToTimelineAction = ({
  store,
  order,
}: {
  store: SecurityAppStore;
  order?: number;
}) => {
  const {
    application: applicationService,
    notifications: { toasts: toastsService },
  } = KibanaServices.get();
  let currentAppId: string | undefined;
  applicationService.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  return createAction<CellValueContext>({
    id: ACTION_ID,
    type: ACTION_ID,
    order,
    getIconType: () => ADD_TO_TIMELINE_ICON,
    getDisplayName: () => ADD_TO_TIMELINE,
    isCompatible: async ({ embeddable, data }) =>
      !isErrorEmbeddable(embeddable) &&
      isLensEmbeddable(embeddable) &&
      isFilterableEmbeddable(embeddable) &&
      isDataColumnsFilterable(data) &&
      isInSecurityApp(currentAppId),
    execute: async ({ data }) => {
      const dataProviders = data.reduce<DataProvider[]>((acc, { columnMeta, value, eventId }) => {
        const dataProvider = createDataProviders({
          contextId: TimelineId.active,
          fieldType: columnMeta?.type,
          values: value,
          field: columnMeta?.field,
          eventId,
        });
        if (dataProvider) {
          acc.push(...dataProvider);
        }
        return acc;
      }, []);

      if (dataProviders.length > 0) {
        store.dispatch(addProvider({ id: TimelineId.active, providers: dataProviders }));
        store.dispatch(showTimeline({ id: TimelineId.active, show: true }));
      } else {
        toastsService.addWarning({
          title: ADD_TO_TIMELINE_FAILED_TITLE,
          text: ADD_TO_TIMELINE_FAILED_TEXT,
        });
      }
    },
  });
};
