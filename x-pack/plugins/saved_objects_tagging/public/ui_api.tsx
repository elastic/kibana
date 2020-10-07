/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  SavedObject,
  SavedObjectReference,
  SavedObjectsFindOptionsReference,
} from 'src/core/public';
import {
  TaggingApiUi,
  GetSearchBarFilterOptions,
  ParseSearchQueryOptions,
} from '../../../../src/plugins/saved_objects_tagging_oss/public';
import { ITagsCache } from './tags';
import { TagSearchBarOption } from './components';
import { getConnectedTagListComponent } from './components/connected';

interface GetApiComponentsOptions {
  cache: ITagsCache;
}

export const getApiComponents = ({ cache }: GetApiComponentsOptions): TaggingApiUi => {
  const components = {
    TagList: getConnectedTagListComponent(cache),
  };

  return {
    components,
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
    getTableColumnDefinition: () => {
      return {
        field: 'references',
        name: i18n.translate('savedObjectsTagging.uiApi.table.columnTagsName', {
          defaultMessage: 'Tags',
        }),
        description: i18n.translate('savedObjectsTagging.uiApi.table.columnTagsDescription', {
          defaultMessage: 'Tags associated with this saved object',
        }),
        sortable: false,
        'data-test-subj': 'savedObjectsTableRowTags',
        render: (references: SavedObjectReference[], object: SavedObject) => {
          return <components.TagList object={object} />;
        },
      };
    },
    convertNameToReference: (tagName: string) => {
      const found = cache.getState().find((tag) => tag.title === tagName);
      return found ? { type: 'tag', id: found.id } : undefined;
    },
    parseSearchQuery: (
      query: string,
      { tagClause = 'tag', useName = false }: ParseSearchQueryOptions = {}
    ) => {
      const parsed = Query.parse(query);
      // from other usages of `Query.parse` in the codebase, it seems that
      // for empty term, the parsed query can be undefined, even if the type def state otherwise.
      if (!query) {
        return {
          searchTerm: '',
          tagReferences: [],
        };
      }

      let searchTerm: string = '';
      let tagReferences: SavedObjectsFindOptionsReference[] = [];

      if (parsed.ast.getTermClauses().length) {
        searchTerm = parsed.ast
          .getTermClauses()
          .map((clause: any) => clause.value)
          .join(' ');
      }
      if (parsed.ast.getFieldClauses(tagClause)) {
        const selectedTags = parsed.ast.getFieldClauses(tagClause)[0].value as string[];
        if (useName) {
          // TODO: use convertNameToReference directly instead
          selectedTags.forEach((tagName) => {
            const found = cache.getState().find((tag) => tag.title === tagName);
            if (found) {
              tagReferences.push({
                type: 'tag',
                id: found.id,
              });
            }
          });
        } else {
          tagReferences = selectedTags.map((tagId) => ({ type: 'tag', id: tagId }));
        }
      }

      return {
        searchTerm,
        tagReferences: tagReferences.length ? tagReferences : undefined,
      };
    },
  };
};
