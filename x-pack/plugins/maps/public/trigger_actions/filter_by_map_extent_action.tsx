/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Embeddable, EmbeddableInput } from '@kbn/embeddable-plugin/public';
import { createReactOverlays } from '@kbn/kibana-react-plugin/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { isLegacyMap } from '../legacy_visualizations';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import { getCore } from '../kibana_services';

export const FILTER_BY_MAP_EXTENT = 'FILTER_BY_MAP_EXTENT';

interface FilterByMapExtentInput extends EmbeddableInput {
  filterByMapExtent: boolean;
}

interface FilterByMapExtentActionContext {
  embeddable: Embeddable<FilterByMapExtentInput>;
}

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
  isCompatible: async ({ embeddable }: FilterByMapExtentActionContext) => {
    return (
      (embeddable.type === MAP_SAVED_OBJECT_TYPE || isLegacyMap(embeddable)) &&
      !embeddable.getInput().disableTriggers
    );
  },
  execute: async (context: FilterByMapExtentActionContext) => {
    const { FilterByMapExtentModal } = await import('./filter_by_map_extent_modal');
    const { openModal } = createReactOverlays(getCore());
    const modalSession = openModal(
      <FilterByMapExtentModal
        onClose={() => modalSession.close()}
        title={getDisplayName(context.embeddable)}
      />
    );
  },
});
