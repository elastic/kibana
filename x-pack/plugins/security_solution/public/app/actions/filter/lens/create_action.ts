/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addExistsFilter, addFilterIn, addFilterOut } from '@kbn/cell-actions/actions';
import {
  isValueSupportedByDefaultActions,
  filterOutNullableValues,
  valueToArray,
} from '@kbn/cell-actions/actions/utils';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import type { CellValueContext, IEmbeddable } from '@kbn/embeddable-plugin/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { ACTION_INCOMPATIBLE_VALUE_WARNING } from '@kbn/cell-actions/src/actions/translations';
import { i18n } from '@kbn/i18n';
import { isInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import { timelineSelectors } from '../../../../timelines/store';
import { fieldHasCellActions, isLensEmbeddable } from '../../utils';
import { TimelineId } from '../../../../../common/types';
import { DefaultCellActionTypes } from '../../constants';
import type { SecurityAppStore } from '../../../../common/store';
import type { StartServices } from '../../../../types';

function isDataColumnsValid(data?: CellValueContext['data']): boolean {
  return (
    !!data &&
    data.length > 0 &&
    data.every(({ columnMeta }) => columnMeta && fieldHasCellActions(columnMeta.field))
  );
}

export interface CreateFilterLensActionParams {
  id: string;
  order: number;
  store: SecurityAppStore;
  services: StartServices;
  negate?: boolean;
}

export const createFilterLensAction = ({
  id,
  order,
  store,
  services,
  negate,
}: CreateFilterLensActionParams) => {
  const {
    application,
    notifications,
    data: dataService,
    topValuesPopover,
    timelineDataService,
  } = services;
  const {
    query: { filterManager: timelineFilterManager },
  } = timelineDataService;

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
      const isCounter = data[0]?.columnMeta?.sourceParams?.type === 'value_count';
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

      const timeline = getTimelineById(store.getState(), TimelineId.active);
      // timeline is open add the filter to timeline, otherwise add filter to global filters
      const filterManager = timeline?.show
        ? timelineFilterManager
        : dataService.query.filterManager;

      // If value type is value_count, we want to filter an `Exists` filter instead of a `Term` filter
      if (isCounter) {
        addExistsFilter({
          filterManager,
          key: field,
          negate: !!negate,
          dataViewId,
        });
        return;
      }

      const addFilter = negate === true ? addFilterOut : addFilterIn;
      addFilter({
        filterManager,
        fieldName: field,
        value,
        dataViewId,
      });
    },
  });
};
