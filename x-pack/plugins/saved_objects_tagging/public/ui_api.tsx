/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  TaggingApiUi,
  GetSearchBarFilterOptions,
} from '../../../../src/plugins/saved_objects_tagging_oss/public';
import { ITagsCache } from './tags';
import { TagSearchBarOption } from './components';
import { getConnectedTagListComponent } from './components/connected';

interface GetApiComponentsOptions {
  cache: ITagsCache;
}

export const getApiComponents = ({ cache }: GetApiComponentsOptions): TaggingApiUi => {
  return {
    getSearchBarFilter: ({ valueField = 'id' }: GetSearchBarFilterOptions = {}) => {
      return {
        type: 'field_value_selection',
        field: 'tag',
        name: 'Tags',
        multiSelect: 'or',
        options: () => {
          // we are using the promise version of `options` because the handler is called
          // everytime the filter is opened. That way we can keep in sync in case of tags
          // that would be added without the searchbar having trigger a re-render.
          return Promise.resolve(
            cache.getState().map((tag) => {
              return {
                value: valueField === 'name' ? tag.title : tag.id,
                name: tag.title,
                view: <TagSearchBarOption tag={tag} />,
              };
            })
          );
        },
      };
    },
    convertNameToReference: (tagName: string) => {
      const found = cache.getState().find((tag) => tag.title === tagName);
      return found ? { type: 'tag', id: found.id } : undefined;
    },
    components: {
      TagList: getConnectedTagListComponent(cache),
    },
  };
};
