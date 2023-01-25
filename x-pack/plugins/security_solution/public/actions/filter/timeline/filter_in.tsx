/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellActionExecutionContext } from '@kbn/cell-actions';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import { createFilter } from '../helpers';
import type { SecurityAppStore } from '../../../common/store';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { isInSecurityApp } from '../../utils';
import { KibanaServices } from '../../../common/lib/kibana';
import { TimelineId } from '../../../../common/types';

export const FILTER_IN = i18n.translate('xpack.securitySolution.actions.filterIn', {
  defaultMessage: 'Filter In',
});
const ID = 'security_timeline_filterIn';
const ICON = 'plusInCircle';

export const createFilterInAction = ({
  store,
  order,
}: {
  store: SecurityAppStore;
  order?: number;
}) => {
  const { application: applicationService } = KibanaServices.get();
  let currentAppId: string | undefined;
  applicationService.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  return createAction<CellActionExecutionContext>({
    id: ID,
    type: ID,
    order,
    getIconType: (): string => ICON,
    getDisplayName: () => FILTER_IN,
    getDisplayNameTooltip: () => FILTER_IN,
    isCompatible: async ({ field }) =>
      isInSecurityApp(currentAppId) && field.name != null && field.value != null,
    execute: async ({ field }) => {
      const makeFilter = (currentVal?: string[] | string | null) =>
        currentVal?.length === 0
          ? createFilter(field.name, undefined)
          : createFilter(field.name, currentVal);

      const state = store.getState();
      const getTimeline = timelineSelectors.getTimelineByIdSelector();
      const filterManager = getTimeline(state, TimelineId.active)?.filterManager;

      if (filterManager != null) {
        filterManager.addFilters(makeFilter(field.value));
      }
    },
  });
};
