/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellValueContext, IEmbeddable } from '@kbn/embeddable-plugin/public';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { apiPublishesUnifiedSearch } from '@kbn/presentation-publishing';
import { isLensApi } from '@kbn/lens-plugin/public';
import { isInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import { KibanaServices } from '../../../../common/lib/kibana';
import type { SecurityAppStore } from '../../../../common/store/types';
import { addProvider } from '../../../../timelines/store/actions';
import type { DataProvider } from '../../../../../common/types';
import { extractTimelineCapabilities } from '../../../../common/utils/timeline_capabilities';
import { EXISTS_OPERATOR, TimelineId } from '../../../../../common/types';
import { fieldHasCellActions } from '../../utils';
import {
  ADD_TO_TIMELINE,
  ADD_TO_TIMELINE_FAILED_TEXT,
  ADD_TO_TIMELINE_FAILED_TITLE,
  ADD_TO_TIMELINE_ICON,
  ADD_TO_TIMELINE_SUCCESS_TITLE,
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

export const getInvestigatedValue = (dataProviders: DataProvider[]) => {
  const dataValue = dataProviders.reduce<string[]>(
    (acc, { queryMatch: { value, operator, field } }) => {
      if (value != null) {
        // This is the case when value is a number, and queried by fieldName: *
        if (operator === EXISTS_OPERATOR) {
          acc.push(field);
        } else {
          const fieldValue = Array.isArray(value) ? value.join(', ') : value.toString();
          acc.push(fieldValue);
        }
      }

      return acc;
    },
    []
  );
  return dataValue.join(', ');
};

export const createAddToTimelineLensAction = ({
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
  const timelineCapabilities = extractTimelineCapabilities(applicationService.capabilities);

  return createAction<CellValueContext>({
    id: ACTION_ID,
    type: ACTION_ID,
    order,
    getIconType: () => ADD_TO_TIMELINE_ICON,
    getDisplayName: () => ADD_TO_TIMELINE,
    isCompatible: async ({ embeddable, data }) =>
      (timelineCapabilities.read || timelineCapabilities.crud) &&
      !isErrorEmbeddable(embeddable as IEmbeddable) &&
      isLensApi(embeddable) &&
      apiPublishesUnifiedSearch(embeddable) &&
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
          sourceParamType: columnMeta?.sourceParams?.type,
        });
        if (dataProvider) {
          acc.push(...dataProvider);
        }
        return acc;
      }, []);

      if (dataProviders.length > 0) {
        store.dispatch(addProvider({ id: TimelineId.active, providers: dataProviders }));

        const investigatedValue = getInvestigatedValue(dataProviders);
        if (investigatedValue.length > 0) {
          toastsService.addSuccess({
            title: ADD_TO_TIMELINE_SUCCESS_TITLE(investigatedValue),
          });
        }
      } else {
        toastsService.addWarning({
          title: ADD_TO_TIMELINE_FAILED_TITLE,
          text: ADD_TO_TIMELINE_FAILED_TEXT,
        });
      }
    },
  });
};
