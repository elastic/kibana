/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isUndefined } from 'lodash';
import { set } from '@elastic/safer-lodash-set/fp';
import { get, keyBy, pick, isEmpty } from 'lodash/fp';
import { useEffect, useMemo, useState } from 'react';
import memoizeOne from 'memoize-one';
import { IIndexPattern } from 'src/plugins/data/public';

import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { useUiSetting$ } from '../../lib/kibana';

import { IndexField, SourceQuery } from '../../../graphql/types';

import { sourceQuery } from './index.gql_query';
import { useApolloClient } from '../../utils/apollo_context';

export { sourceQuery };

export interface BrowserField {
  aggregatable: boolean;
  category: string;
  description: string | null;
  example: string | number | null;
  fields: Readonly<Record<string, Partial<BrowserField>>>;
  format: string;
  indexes: string[];
  name: string;
  searchable: boolean;
  type: string;
}

export interface DocValueFields {
  field: string;
  format: string;
}

export type BrowserFields = Readonly<Record<string, Partial<BrowserField>>>;

export const getAllBrowserFields = (browserFields: BrowserFields): Array<Partial<BrowserField>> =>
  Object.values(browserFields).reduce<Array<Partial<BrowserField>>>(
    (acc, namespace) => [
      ...acc,
      ...Object.values(namespace.fields != null ? namespace.fields : {}),
    ],
    []
  );

export const getAllFieldsByName = (
  browserFields: BrowserFields
): { [fieldName: string]: Partial<BrowserField> } =>
  keyBy('name', getAllBrowserFields(browserFields));

export const getIndexFields = memoizeOne(
  (title: string, fields: IndexField[]): IIndexPattern =>
    fields && fields.length > 0
      ? {
          fields: fields.map((field) =>
            pick(['name', 'searchable', 'type', 'aggregatable'], field)
          ),
          title,
        }
      : { fields: [], title },
  (newArgs, lastArgs) => newArgs[0] === lastArgs[0] && newArgs[1].length === lastArgs[1].length
);

export const getBrowserFields = memoizeOne(
  (_title: string, fields: IndexField[]): BrowserFields =>
    fields && fields.length > 0
      ? fields.reduce<BrowserFields>(
          (accumulator: BrowserFields, field: IndexField) =>
            set([field.category, 'fields', field.name], field, accumulator),
          {}
        )
      : {},
  // Update the value only if _title has changed
  (newArgs, lastArgs) => newArgs[0] === lastArgs[0]
);

export const getDocValueFields = memoizeOne(
  (_title: string, fields: IndexField[]): DocValueFields[] =>
    fields && fields.length > 0
      ? fields.reduce<DocValueFields[]>((accumulator: DocValueFields[], field: IndexField) => {
          if (field.type === 'date' && accumulator.length < 100) {
            const format: string =
              field.format != null && !isEmpty(field.format) ? field.format : 'date_time';
            return [
              ...accumulator,
              {
                field: field.name,
                format,
              },
            ];
          }
          return accumulator;
        }, [])
      : [],
  // Update the value only if _title has changed
  (newArgs, lastArgs) => newArgs[0] === lastArgs[0]
);

export const indicesExistOrDataTemporarilyUnavailable = (
  indicesExist: boolean | null | undefined
) => indicesExist || isUndefined(indicesExist);

const EMPTY_BROWSER_FIELDS = {};
const EMPTY_DOCVALUE_FIELD: DocValueFields[] = [];

interface UseWithSourceState {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  errorMessage: string | null;
  indexPattern: IIndexPattern;
  indicesExist: boolean | undefined | null;
  loading: boolean;
}

export const useWithSource = (
  sourceId = 'default',
  indexToAdd?: string[] | null,
  onlyCheckIndexToAdd?: boolean
) => {
  const [configIndex] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const defaultIndex = useMemo<string[]>(() => {
    if (indexToAdd != null && !isEmpty(indexToAdd)) {
      return onlyCheckIndexToAdd ? indexToAdd : [...configIndex, ...indexToAdd];
    }
    return configIndex;
  }, [configIndex, indexToAdd, onlyCheckIndexToAdd]);

  const [state, setState] = useState<UseWithSourceState>({
    browserFields: EMPTY_BROWSER_FIELDS,
    docValueFields: EMPTY_DOCVALUE_FIELD,
    errorMessage: null,
    indexPattern: getIndexFields(defaultIndex.join(), []),
    indicesExist: indicesExistOrDataTemporarilyUnavailable(undefined),
    loading: false,
  });

  const apolloClient = useApolloClient();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function fetchSource() {
      if (!apolloClient) return;

      setState((prevState) => ({ ...prevState, loading: true }));

      try {
        const result = await apolloClient.query<SourceQuery.Query, SourceQuery.Variables>({
          query: sourceQuery,
          fetchPolicy: 'cache-first',
          variables: {
            sourceId,
            defaultIndex,
          },
          context: {
            fetchOptions: {
              signal: abortCtrl.signal,
            },
          },
        });

        if (isSubscribed) {
          setState({
            loading: false,
            indicesExist: indicesExistOrDataTemporarilyUnavailable(
              get('data.source.status.indicesExist', result)
            ),
            browserFields: getBrowserFields(
              defaultIndex.join(),
              get('data.source.status.indexFields', result)
            ),
            docValueFields: getDocValueFields(
              defaultIndex.join(),
              get('data.source.status.indexFields', result)
            ),
            indexPattern: getIndexFields(
              defaultIndex.join(),
              get('data.source.status.indexFields', result)
            ),
            errorMessage: null,
          });
        }
      } catch (error) {
        if (isSubscribed) {
          setState((prevState) => ({
            ...prevState,
            loading: false,
            errorMessage: error.message,
          }));
        }
      }
    }

    fetchSource();

    return () => {
      isSubscribed = false;
      return abortCtrl.abort();
    };
  }, [apolloClient, sourceId, defaultIndex]);

  return state;
};
