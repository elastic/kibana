/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { SavedObject, SavedObjectReference } from 'src/core/public';
import {
  TaggingApiUi,
  TaggingApiUiComponent,
} from '../../../../../src/plugins/saved_objects_tagging_oss/public';

export interface GetTableColumnDefinitionOptions {
  components: TaggingApiUiComponent;
}

export const buildGetTableColumnDefinition = ({
  components,
}: GetTableColumnDefinitionOptions): TaggingApiUi['getTableColumnDefinition'] => {
  return () => {
    return {
      field: 'references',
      name: i18n.translate('xpack.savedObjectsTagging.uiApi.table.columnTagsName', {
        defaultMessage: 'Tags',
      }),
      description: i18n.translate('xpack.savedObjectsTagging.uiApi.table.columnTagsDescription', {
        defaultMessage: 'Tags associated with this saved object',
      }),
      sortable: false,
      'data-test-subj': 'savedObjectsTableRowTags',
      render: (references: SavedObjectReference[], object: SavedObject) => {
        return <components.TagList object={object} />;
      },
    };
  };
};
