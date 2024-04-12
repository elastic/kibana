/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addFilterIn, addFilterOut } from '@kbn/cell-actions';
import {
  isValueSupportedByDefaultActions,
  valueToArray,
  filterOutNullableValues,
} from '@kbn/cell-actions/src/actions/utils';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import type { CellValueContext, IEmbeddable } from '@kbn/embeddable-plugin/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { ACTION_INCOMPATIBLE_VALUE_WARNING } from '@kbn/cell-actions/src/actions/translations';
import { i18n } from '@kbn/i18n';
import { timelineSelectors } from '../../../timelines/store';
import { fieldHasCellActions, isInSecurityApp, isLensEmbeddable } from '../../utils';
import { TimelineId } from '../../../../common/types';
import { DefaultCellActionTypes } from '../../constants';
import type { SecurityAppStore } from '../../../common/store';
import type { StartServices } from '../../../types';

function isDataColumnsValid(data?: CellValueContext['data']): boolean {
  return (
    !!data &&
    data.length > 0 &&
    data.every(({ columnMeta }) => columnMeta && fieldHasCellActions(columnMeta.field))
  );
}

export const createFilterLensAction = ({
  id,
  order,
  store,
  services,
  negate,
}: {
  id: string;
  order: number;
  store: SecurityAppStore;
  services: StartServices;
  negate?: boolean;
}) => {
  const { application, notifications, data: dataService, topValuesPopover } = services;

  let currentAppId: string | undefined;
  application.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });
  const getTimelineById = timelineSelectors.getTimelineByIdSelector();

  return createAction<CellValueContext>({
    id,
    order,
    getIconType: () => (negate ? 'minusInCircle' : 'plusInCircle'),
    getDisplayName: () =>
      negate
        ? i18n.translate('xpack.securitySolution.actions.filterOutTimeline', {
            defaultMessage: `Filter out`,
          })
        : i18n.translate('xpack.securitySolution.actions.filterForTimeline', {
            defaultMessage: `Filter for`,
          }),
    type: DefaultCellActionTypes.FILTER,
    isCompatible: async ({ embeddable, data }) =>
      !isErrorEmbeddable(embeddable as IEmbeddable) &&
      isLensEmbeddable(embeddable as IEmbeddable) &&
      isDataColumnsValid(data) &&
      isInSecurityApp(currentAppId),
    execute: async ({ data }) => {
      const field = data[0]?.columnMeta?.field;
      const rawValue = data[0]?.value;
      const mayBeDataViewId = data[0]?.columnMeta?.sourceParams?.indexPatternId;
      const dataViewId = typeof mayBeDataViewId === 'string' ? mayBeDataViewId : undefined;
      const value = filterOutNullableValues(valueToArray(rawValue));

      if (!isValueSupportedByDefaultActions(value)) {
        notifications.toasts.addWarning({
          title: ACTION_INCOMPATIBLE_VALUE_WARNING,
        });
        return;
      }
      if (!field) return;

      topValuesPopover.closePopover();

      const addFilter = negate === true ? addFilterOut : addFilterIn;

      const timeline = getTimelineById(store.getState(), TimelineId.active);
      // timeline is open add the filter to timeline, otherwise add filter to global filters
      const filterManager = timeline?.show
        ? services.timelineFilterManager
        : dataService.query.filterManager;

      addFilter({ filterManager, fieldName: field, value, dataViewId });
    },
  });
};
