/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// register all the stuff which the pipeline needs later

// @ts-ignore
import { register } from '@kbn/interpreter/common';
import chrome from 'ui/chrome';
// @ts-ignore
import { SearchSourceProvider } from 'ui/courier/search_source';
// @ts-ignore
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
// @ts-ignore
import { IndexPatternsProvider } from 'ui/index_patterns';

// This simply registers a pipeline function and a pipeline renderer to the global pipeline
// context. It will be used by the editor config which is shipped in the same plugin, but
// it could also be used from somewhere else.

function columnTypesFunction() {
  return {
    name: 'column_types',
    type: 'kibana_datatable',
    args: {
      types: {
        types: ['string'],
      },
    },
    context: { types: ['kibana_datatable'] },
    async fn(context: any, args: any) {
      const types = JSON.parse(args.types);

      // esaggs columns are not the same order as the operation order
      // So to reorder, we sort by id: "col-{id}-{index}"
      const columns = [...context.columns].sort((col1: { id: string }, col2: { id: string }) => {
        const col1Parts = col1.id.split('-');
        const col2Parts = col2.id.split('-');
        return col1Parts[col1Parts.length - 1] < col2Parts[col2Parts.length - 1] ? -1 : 1;
      });

      return {
        ...context,
        columns: columns.map((column: any, index: number) => ({
          ...column,
          type: types[index],
        })),
      };
    },
  };
}

function esDocsFunction() {
  return {
    name: 'client_esdocs',
    type: 'kibana_datatable',
    args: {
      index: {
        types: ['string'],
      },
      fields: {
        types: ['string'],
      },
      filter: {
        types: ['string'],
      },
    },
    context: { types: [] },
    async fn(context: any, args: any) {
      const $injector = await chrome.dangerouslyGetActiveInjector();
      const Private: any = $injector.get('Private');
      const indexPatterns = Private(IndexPatternsProvider);
      const SearchSource = Private(SearchSourceProvider);
      const queryFilter = Private(FilterBarQueryFilterProvider);
      const fields: string[] = JSON.parse(args.fields);

      const indexPattern = await indexPatterns.get(args.index);

      const searchSource = new SearchSource();
      searchSource.setField('index', indexPattern);
      searchSource.setField('size', 500);
      searchSource.setField('source', fields);

      searchSource.setField('query', null);
      searchSource.setField('filter', queryFilter.getFilters());

      const response = await searchSource.fetch();

      return {
        type: 'kibana_datatable',
        columns: fields.map(fieldName => ({
          id: fieldName,
          type: indexPattern.fields.find((field: any) => field.name === fieldName).type,
        })),
        rows: response.hits.hits.map((hit: any) => hit._source),
      };
    },
  };
}

export const registerPipeline = (registries: any) => {
  register(registries, {
    browserFunctions: [esDocsFunction, columnTypesFunction],
  });
};
