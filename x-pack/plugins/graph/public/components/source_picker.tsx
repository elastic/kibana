/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';

import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { IndexPatternSavedObject } from '../types';

export interface SourcePickerProps {
  onIndexPatternSelected: (indexPattern: IndexPatternSavedObject) => void;
  contentManagement: ContentManagementPublicStart;
}

const fixedPageSize = 8;

export function SourcePicker({ contentManagement, onIndexPatternSelected }: SourcePickerProps) {
  return (
    <SavedObjectFinder
      services={{ contentClient: contentManagement.client }}
      onChoose={(_id, _type, _name, indexPattern) => {
        onIndexPatternSelected(indexPattern as IndexPatternSavedObject);
      }}
      showFilter={false}
      noItemsMessage={i18n.translate('xpack.graph.sourceModal.notFoundLabel', {
        defaultMessage: 'No data sources found.',
      })}
      savedObjectMetaData={[
        {
          type: 'index-pattern',
          getIconForSavedObject: () => 'indexPatternApp',
          name: i18n.translate('xpack.graph.sourceModal.savedObjectType.dataView', {
            defaultMessage: 'Data view',
          }),
          showSavedObject: (indexPattern) => !indexPattern.attributes.type,
          includeFields: ['type'],
        },
      ]}
      fixedPageSize={fixedPageSize}
    />
  );
}
