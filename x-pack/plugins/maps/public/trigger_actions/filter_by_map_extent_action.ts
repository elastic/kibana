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

export const filterByMapExtentAction = createAction<FilterByMapExtentActionContext>({
  id: FILTER_BY_MAP_EXTENT,
  type: FILTER_BY_MAP_EXTENT,
  order: 20,
  getDisplayName: ({ embeddable }: FilterByMapExtentActionContext) => {
    return embeddable.getInput().filterByMapExtent
      ? i18n.translate('xpack.maps.filterByMapExtentMenuItem.disableDisplayName', {
          defaultMessage: 'Disable filter by map extent',
        })
      : i18n.translate('xpack.maps.filterByMapExtentMenuItem.enableDisplayName', {
          defaultMessage: 'Enable filter by map extent',
        });
  },
  getIconType: () => {
    return 'filter';
  },
  isCompatible: async ({ embeddable }: FilterByMapExtentActionContext) => {
    return (
      embeddable.type === MAP_SAVED_OBJECT_TYPE && embeddable.getInput().viewMode === ViewMode.EDIT
    );
  },
  execute: async ({ embeddable }: FilterByMapExtentActionContext) => {
    embeddable.updateInput({
      filterByMapExtent: !embeddable.getInput().filterByMapExtent,
    });
  },
});
