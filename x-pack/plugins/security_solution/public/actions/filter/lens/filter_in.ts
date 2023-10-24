/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addFilterIn } from '@kbn/cell-actions';
import {
  isValueSupportedByDefaultActions,
  valueToArray,
  filterOutNullableValues,
} from '@kbn/cell-actions/src/actions/utils';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import type { CellValueContext } from '@kbn/embeddable-plugin/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { ACTION_INCOMPATIBLE_VALUE_WARNING } from '@kbn/cell-actions/src/actions/translations';
import { KibanaServices } from '../../../common/lib/kibana';
import type { SecurityAppStore } from '../../../common/store';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { fieldHasCellActions, isInSecurityApp, isLensEmbeddable } from '../../utils';
import { TimelineId } from '../../../../common/types';
import { SecurityCellActionType } from '../../constants';
import type { StartServices } from '../../../types';

export const ACTION_ID = 'embeddable_filterIn';

function isDataColumnsValid(data?: CellValueContext['data']): boolean {
  return (
    !!data &&
    data.length > 0 &&
    data.every(({ columnMeta }) => columnMeta && fieldHasCellActions(columnMeta.field))
  );
}

export const createFilterInLensAction = ({
  store,
  order,
  services,
}: {
  store: SecurityAppStore;
  order: number;
  services: StartServices;
}) => {
  const { application: applicationService } = KibanaServices.get();
  let currentAppId: string | undefined;
  applicationService.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });
  const getTimelineById = timelineSelectors.getTimelineByIdSelector();
  const { filterManager } = services.data.query;
  const { notifications } = services;

  return createAction<CellValueContext>({
    id: ACTION_ID,
    order,
    getIconType: () => 'plusInCircle',
    getDisplayName: () => 'Filter for', // TODO: translate
    type: SecurityCellActionType.FILTER,
    isCompatible: async ({ embeddable, data }) =>
      !isErrorEmbeddable(embeddable) &&
      isLensEmbeddable(embeddable) &&
      isDataColumnsValid(data) &&
      isInSecurityApp(currentAppId),
    execute: async ({ data }) => {
      const field = data[0]?.columnMeta?.field;
      console.log('!!! META: ', data[0]?.columnMeta);
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
      const timeline = getTimelineById(store.getState(), TimelineId.active);

      if (timeline.show) {
        addFilterIn({
          filterManager: timeline.filterManager,
          fieldName: field,
          value,
        });
      } else {
        addFilterIn({
          filterManager,
          fieldName: field,
          value,
        });
      }
    },
  });
};
