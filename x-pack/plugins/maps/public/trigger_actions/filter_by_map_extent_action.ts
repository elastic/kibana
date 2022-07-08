/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Embeddable, EmbeddableInput, ViewMode } from '@kbn/embeddable-plugin/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';

export const FILTER_BY_MAP_EXTENT = 'FILTER_BY_MAP_EXTENT';

interface FilterByMapExtentInput extends EmbeddableInput {
  filterByMapExtent: boolean;
}

interface FilterByMapExtentActionContext {
  embeddable: Embeddable<FilterByMapExtentInput>;
}

export function getFilterByMapExtent(input: { filterByMapExtent?: boolean }) {
  return input.filterByMapExtent === undefined ? false : input.filterByMapExtent;
}

function getContainerLabel(embeddable: Embeddable<FilterByMapExtentInput>) {
  return embeddable.parent?.type === 'dashboard'
    ? i18n.translate('xpack.maps.filterByMapExtentMenuItem.dashboardLabel', {
        defaultMessage: 'dashboard',
      })
    : '';
}

export const filterByMapExtentAction = createAction<FilterByMapExtentActionContext>({
  id: FILTER_BY_MAP_EXTENT,
  type: FILTER_BY_MAP_EXTENT,
  order: 20,
  getDisplayName: (context: FilterByMapExtentActionContext) => {
    return i18n.translate('xpack.maps.filterByMapExtentMenuItem.displayName', {
      defaultMessage: 'Filter {containerLabel} by map bounds',
      values: { containerLabel: getContainerLabel(context.embeddable) }
    });
  },
  getDisplayNameTooltip: (context: FilterByMapExtentActionContext) => {
    return i18n.translate('xpack.maps.filterByMapExtentMenuItem.displayNameTooltip', {
      defaultMessage:
        'As you zoom and pan your map, update {containerLabel} panels to only include data that is visible in your map',
      values: { containerLabel: getContainerLabel(context.embeddable) }
    });
  },
  getIconType: () => {
    return 'filter';
  },
  isCompatible: async ({ embeddable }: FilterByMapExtentActionContext) => {
    return (
      embeddable.type === MAP_SAVED_OBJECT_TYPE &&
      !embeddable.getInput().disableTriggers
    );
  },
  execute: async ({ embeddable }: FilterByMapExtentActionContext) => {
    embeddable.updateInput({
      filterByMapExtent: !getFilterByMapExtent(embeddable.getInput()),
    });
  },
});
