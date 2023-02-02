/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fieldHasCellActions } from '../../utils';
import type { SecurityCellAction } from '../../types';
import { SHOW_DETAILS_ICON, SHOW_DETAILS_TITLE } from '../constants';
import type { SecurityAppStore } from '../../../common/store';
import { getScopedActions } from '../../../helpers';
import { activeTimeline } from '../../../timelines/containers/active_timeline_context';
import { TimelineId, TimelineTabs } from '../../../../common/types';
import { DETAILS_FIELDS } from '../details_fields';

const ID = 'security_showDetails';

export const createDefaultShowDetailsAction = ({
  store,
  order,
}: {
  store: SecurityAppStore;
  order?: number;
}): SecurityCellAction => ({
  id: ID,
  type: ID,
  order,
  getIconType: () => SHOW_DETAILS_ICON,
  getDisplayName: ({ field }) => getDetailsFieldDisplayName(field.name),
  getDisplayNameTooltip: ({ field }) => getDetailsFieldDisplayName(field.name),
  isCompatible: async ({ field, metadata }) =>
    fieldHasCellActions(field.name) &&
    metadata?.scopeId != null &&
    getDetailsField(field.name) != null,
  execute: async ({ field, metadata }) => {
    const { scopeId, timelineTab } = metadata ?? {};

    const value = field.value && Array.isArray(field.value) ? field.value[0] : field.value;
    const detailsField = getDetailsField(field.name);
    if (!scopeId || !value || !detailsField) {
      return;
    }
    const expandedDetail = detailsField.createExpandedDetail(value);
    const scopedActions = getScopedActions(scopeId);
    if (scopedActions) {
      store.dispatch(
        scopedActions.toggleDetailPanel({
          ...expandedDetail,
          id: scopeId,
          tabType: timelineTab,
        })
      );
    }

    if (scopeId === TimelineId.active && timelineTab === TimelineTabs.query) {
      activeTimeline.toggleExpandedDetail({ ...expandedDetail });
    }
  },
});

const getDetailsFieldDisplayName = (fieldName: string): string => {
  const detailsField = getDetailsField(fieldName);
  return detailsField ? SHOW_DETAILS_TITLE(detailsField.label) : '';
};

const getDetailsField = (fieldName: string) => {
  if (!fieldName || !DETAILS_FIELDS[fieldName]) {
    return null;
  }
  return DETAILS_FIELDS[fieldName];
};
