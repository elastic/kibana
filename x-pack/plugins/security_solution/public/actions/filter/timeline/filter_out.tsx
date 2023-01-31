/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CellAction } from '@kbn/cell-actions';
import { createFilter } from '../helpers';
import { KibanaServices } from '../../../common/lib/kibana';
import { fieldHasCellActions, isInSecurityApp } from '../../utils';
import type { SecurityAppStore } from '../../../common/store';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { TimelineId } from '../../../../common/types';

export const FILTER_OUT = i18n.translate('xpack.securitySolution.actions.filterOut', {
  defaultMessage: 'Filter Out',
});
const ID = 'security_timeline_filterOut';
const ICON = 'minusInCircle';

export const createFilterOutAction = ({
  store,
  order,
}: {
  store: SecurityAppStore;
  order?: number;
}): CellAction => {
  const { application: applicationService } = KibanaServices.get();
  let currentAppId: string | undefined;
  applicationService.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  return {
    id: ID,
    type: ID,
    order,
    getIconType: (): string => ICON,
    getDisplayName: () => FILTER_OUT,
    getDisplayNameTooltip: () => FILTER_OUT,
    isCompatible: async ({ field }) =>
      isInSecurityApp(currentAppId) && fieldHasCellActions(field.name),
    execute: async ({ field }) => {
      const makeFilter = (currentVal?: string[] | string | null) =>
        currentVal == null || currentVal?.length === 0
          ? createFilter(field.name, null, false)
          : createFilter(field.name, currentVal, true);

      const state = store.getState();
      const getTimeline = timelineSelectors.getTimelineByIdSelector();
      const filterManager = getTimeline(state, TimelineId.active)?.filterManager;

      if (filterManager != null) {
        filterManager.addFilters(makeFilter(field.value));
      }
    },
  };
};
