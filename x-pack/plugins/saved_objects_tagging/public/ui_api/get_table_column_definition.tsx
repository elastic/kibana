/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { SavedObject, SavedObjectReference } from '@kbn/core/public';
import {
  SavedObjectsTaggingApiUi,
  SavedObjectsTaggingApiUiComponent,
} from '@kbn/saved-objects-tagging-oss-plugin/public';
import { ITagsCache } from '../services';
import { getTagsFromReferences, byNameTagSorter } from '../utils';

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
