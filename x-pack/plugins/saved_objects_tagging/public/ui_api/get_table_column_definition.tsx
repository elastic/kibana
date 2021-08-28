/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import type {
  SavedObject,
  SavedObjectReference,
} from '../../../../../src/core/types/saved_objects';
import type {
  ITagsCache,
  SavedObjectsTaggingApiUi,
  SavedObjectsTaggingApiUiComponent,
} from '../../../../../src/plugins/saved_objects_tagging_oss/public/api';
import { byNameTagSorter, getTagsFromReferences } from '../utils';

export interface GetTableColumnDefinitionOptions {
  components: SavedObjectsTaggingApiUiComponent;
  cache: ITagsCache;
}

export const buildGetTableColumnDefinition = ({
  components,
  cache,
}: GetTableColumnDefinitionOptions): SavedObjectsTaggingApiUi['getTableColumnDefinition'] => {
  return () => {
    return {
      field: 'references',
      name: i18n.translate('xpack.savedObjectsTagging.uiApi.table.columnTagsName', {
        defaultMessage: 'Tags',
      }),
      description: i18n.translate('xpack.savedObjectsTagging.uiApi.table.columnTagsDescription', {
        defaultMessage: 'Tags associated with this saved object',
      }),
      sortable: (object: SavedObject) => {
        const { tags } = getTagsFromReferences(object.references, cache.getState());
        tags.sort(byNameTagSorter);
        return tags.length ? tags[0].name : undefined;
      },
      render: (references: SavedObjectReference[], object: SavedObject) => {
        return <components.TagList object={object} />;
      },
      'data-test-subj': 'listingTableRowTags',
    };
  };
};
