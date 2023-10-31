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
import type { CellValueContext } from '@kbn/embeddable-plugin/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { ACTION_INCOMPATIBLE_VALUE_WARNING } from '@kbn/cell-actions/src/actions/translations';
import { i18n } from '@kbn/i18n';
import { KibanaServices } from '../../../common/lib/kibana';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { fieldHasCellActions, isInSecurityApp, isLensEmbeddable } from '../../utils';
import { TimelineId } from '../../../../common/types';
import { SecurityCellActionType } from '../../constants';
import type { SecurityAppStore } from '../../../common/store';
import type { StartServices } from '../../../types';
import { HISTOGRAM_LEGEND_ACTION_FILTER_IN } from './filter_in';
import { HISTOGRAM_LEGEND_ACTION_FILTER_OUT } from './filter_out';

function isDataColumnsValid(data?: CellValueContext['data']): boolean {
  return (
    !!data &&
    data.length > 0 &&
    data.every(({ columnMeta }) => columnMeta && fieldHasCellActions(columnMeta.field))
  );
}

export const createHistogramFilterLegendActionFactory = ({
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
  const { application: applicationService } = KibanaServices.get();
  let currentAppId: string | undefined;
  applicationService.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });
  const getTimelineById = timelineSelectors.getTimelineByIdSelector();
  const { notifications } = services;
  const { filterManager } = services.data.query;

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
    type: SecurityCellActionType.FILTER,
    isCompatible: async ({ embeddable, data }) =>
      !isErrorEmbeddable(embeddable) &&
      isLensEmbeddable(embeddable) &&
      isDataColumnsValid(data) &&
      isInSecurityApp(currentAppId),
    execute: async ({ data }) => {
      const field = data[0]?.columnMeta?.field;
      const rawValue = data[0]?.value;
      const value = filterOutNullableValues(valueToArray(rawValue));

      if (!isValueSupportedByDefaultActions(value)) {
        notifications.toasts.addWarning({
          title: ACTION_INCOMPATIBLE_VALUE_WARNING,
        });
        return;
      }

      if (!field) return;

      const timeline = getTimelineById(store.getState(), TimelineId.active);
      services.topValuesPopover.closePopover();

      if (!negate) {
        addFilterIn({
          filterManager:
            id === HISTOGRAM_LEGEND_ACTION_FILTER_IN ? filterManager : timeline.filterManager,
          fieldName: field,
          value,
        });
      } else {
        addFilterOut({
          filterManager:
            id === HISTOGRAM_LEGEND_ACTION_FILTER_OUT ? filterManager : timeline.filterManager,
          fieldName: field,
          value,
        });
      }
    },
  });
};
