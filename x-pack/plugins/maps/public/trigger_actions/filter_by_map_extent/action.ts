/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Embeddable } from '@kbn/embeddable-plugin/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import type { FilterByMapExtentActionContext, FilterByMapExtentInput } from './types';

export const FILTER_BY_MAP_EXTENT = 'FILTER_BY_MAP_EXTENT';

function getContainerLabel(embeddable: Embeddable<FilterByMapExtentInput>) {
  return embeddable.parent?.type === 'dashboard'
    ? i18n.translate('xpack.maps.filterByMapExtentMenuItem.dashboardLabel', {
        defaultMessage: 'dashboard',
      })
    : i18n.translate('xpack.maps.filterByMapExtentMenuItem.pageLabel', {
        defaultMessage: 'page',
      });
}

function getDisplayName(embeddable: Embeddable<FilterByMapExtentInput>) {
  return i18n.translate('xpack.maps.filterByMapExtentMenuItem.displayName', {
    defaultMessage: 'Filter {containerLabel} by map bounds',
    values: { containerLabel: getContainerLabel(embeddable) },
  });
}

export const filterByMapExtentAction = createAction<FilterByMapExtentActionContext>({
  id: FILTER_BY_MAP_EXTENT,
  type: FILTER_BY_MAP_EXTENT,
  order: 20,
  getDisplayName: (context: FilterByMapExtentActionContext) => {
    return getDisplayName(context.embeddable);
  },
  getDisplayNameTooltip: (context: FilterByMapExtentActionContext) => {
    return i18n.translate('xpack.maps.filterByMapExtentMenuItem.displayNameTooltip', {
      defaultMessage:
        'As you zoom and pan the map, the {containerLabel} updates to display only the data visible in the map bounds.',
      values: { containerLabel: getContainerLabel(context.embeddable) },
    });
  },
  getIconType: () => {
    return 'filter';
  },
  isCompatible: async (context: FilterByMapExtentActionContext) => {
    const { isCompatible } = await import('./is_compatible');
    return isCompatible(context);
  },
  execute: async (context: FilterByMapExtentActionContext) => {
    const { openModal } = await import('./modal');
    openModal(getDisplayName(context.embeddable));
  },
});
