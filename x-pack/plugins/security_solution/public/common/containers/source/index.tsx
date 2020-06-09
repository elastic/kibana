/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isUndefined } from 'lodash';
import { get, keyBy, pick, set, isEmpty } from 'lodash/fp';
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
      : { fields: [], title }
);

export const getBrowserFields = memoizeOne(
  (fields: IndexField[]): BrowserFields =>
    fields && fields.length > 0
      ? fields.reduce<BrowserFields>(
          (accumulator: BrowserFields, field: IndexField) =>
            set([field.category, 'fields', field.name], field, accumulator),
          {}
        )
      : {}
);

export const indicesExistOrDataTemporarilyUnavailable = (
  indicesExist: boolean | null | undefined
) => indicesExist || isUndefined(indicesExist);

export const useWithSource = (sourceId = 'default', indexToAdd?: string[] | null) => {
  const [configIndex] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const [loading, updateLoading] = useState(false);
  const [indicesExist, setIndicesExist] = useState<boolean | undefined | null>(undefined);
  const [browserFields, setBrowserFields] = useState<BrowserFields>({});
  const [errorMessage, updateErrorMessage] = useState<string | null>(null);
  const defaultIndex = useMemo<string[]>(() => {
    if (indexToAdd != null && !isEmpty(indexToAdd)) {
      return [...configIndex, ...indexToAdd];
    }
    return configIndex;
  }, [configIndex, indexToAdd]);
  const [indexPattern, setIndexPattern] = useState<IIndexPattern>(
    getIndexFields(defaultIndex.join(), [])
  );

  const apolloClient = useApolloClient();

  useEffect(() => {
    const abortCtrl = new AbortController();

    async function fetchSource() {
      updateLoading(true);
      if (apolloClient) {
        apolloClient
          .query<SourceQuery.Query, SourceQuery.Variables>({
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
          })
          .then(
            (result) => {
              updateLoading(false);
              updateErrorMessage(null);
              setIndicesExist(get('data.source.status.indicesExist', result));
              setBrowserFields(getBrowserFields(get('data.source.status.indexFields', result)));
              setIndexPattern(
                getIndexFields(defaultIndex.join(), get('data.source.status.indexFields', result))
              );
            },
            (error) => {
              updateLoading(false);
              updateErrorMessage(error.message);
            }
          );
      }
    }

    fetchSource();

    return () => abortCtrl.abort();
  }, [apolloClient, sourceId, defaultIndex]);

  return {
    indicesExist: indicesExistOrDataTemporarilyUnavailable(indicesExist),
    browserFields,
    indexPattern,
    loading,
    errorMessage,
  };
};
