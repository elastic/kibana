/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual, isUndefined } from 'lodash';
import { set } from '@elastic/safer-lodash-set/fp';
import { get, keyBy, pick, isEmpty } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';

import { IIndexPattern } from 'src/plugins/data/public';

import { DEFAULT_INDEX_KEY, NO_ALERT_INDEX } from '../../../../common/constants';
import { useKibana, useUiSetting$ } from '../../lib/kibana';

import { SourceQuery } from '../../../graphql/types';

import { sourceQuery } from './index.gql_query';
import { useApolloClient } from '../../utils/apollo_context';
import {
  IndexField,
  IndexFieldsStrategyResponse,
  IndexFieldsStrategyRequest,
} from '../../../../common/search_strategy/index_fields';
import { AbortError } from '../../../../../../../src/plugins/data/common';
import * as i18n from './translations';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { sourcererActions, sourcererSelectors } from '../../store/sourcerer';

import { State } from '../../store';

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
            pick(['name', 'searchable', 'type', 'aggregatable', 'esTypes', 'subType'], field)
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

export const getDocValueFields2 = memoizeOne(
  (_title: string, fields: IndexField[]): DocValueFields[] =>
    fields && fields.length > 0
      ? fields.reduce<DocValueFields[]>((accumulator: DocValueFields[], field: IndexField) => {
          if (field.readFromDocValues && accumulator.length < 100) {
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
  onlyCheckIndexToAdd?: boolean,
  // Fun fact: When using this hook multiple times within a component (e.g. add_exception_modal & edit_exception_modal),
  // the apolloClient will perform queryDeduplication and prevent the first query from executing. A deep compare is not
  // performed on `indices`, so another field must be passed to circumvent this.
  // For details, see https://github.com/apollographql/react-apollo/issues/2202
  queryDeduplication = 'default'
) => {
  const [configIndex] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const defaultIndex = useMemo<string[]>(() => {
    const filterIndexAdd = (indexToAdd ?? []).filter((item) => item !== NO_ALERT_INDEX);
    if (!isEmpty(filterIndexAdd)) {
      return onlyCheckIndexToAdd ? filterIndexAdd : [...configIndex, ...filterIndexAdd];
    }
    return configIndex;
  }, [configIndex, indexToAdd, onlyCheckIndexToAdd]);

  const [state, setState] = useState<UseWithSourceState>({
    browserFields: EMPTY_BROWSER_FIELDS,
    docValueFields: EMPTY_DOCVALUE_FIELD,
    errorMessage: null,
    indexPattern: getIndexFields(defaultIndex.join(), []),
    indicesExist: indicesExistOrDataTemporarilyUnavailable(undefined),
    loading: true,
  });

  const apolloClient = useApolloClient();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function fetchSource() {
      if (!apolloClient) return;

      setState((prevState) => ({ ...prevState, loading: true }));

      try {
        const result = await apolloClient.query<
          SourceQuery.Query,
          SourceQuery.Variables & { queryDeduplication: string }
        >({
          query: sourceQuery,
          fetchPolicy: 'cache-first',
          variables: {
            sourceId,
            defaultIndex,
            queryDeduplication,
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
  }, [apolloClient, sourceId, defaultIndex, queryDeduplication]);

  return state;
};

export const useIndexFields = (sourcererScopeName: SourcererScopeName) => {
  const { data, notifications } = useKibana().services;
  const abortCtrl = useRef(new AbortController());
  const dispatch = useDispatch();
  const previousIndexesName = useRef<string[]>([]);

  const indexNamesSelectedSelector = useMemo(
    () => sourcererSelectors.getIndexesNameSelectedSelector(),
    []
  );
  const indexNames = useSelector<State, string[]>(
    (state) => indexNamesSelectedSelector(state, sourcererScopeName),
    shallowEqual
  );

  const setLoading = useCallback(
    (loading: boolean) => {
      dispatch(sourcererActions.setSourcererScopeLoading({ id: sourcererScopeName, loading }));
    },
    [dispatch, sourcererScopeName]
  );

  const indexFieldsSearch = useCallback(
    (indicesName) => {
      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);
        const searchSubscription$ = data.search
          .search<IndexFieldsStrategyRequest, IndexFieldsStrategyResponse>(
            { indices: indicesName },
            {
              abortSignal: abortCtrl.current.signal,
              strategy: 'securitySolutionIndexFields',
            }
          )
          .subscribe({
            next: (response) => {
              if (!response.isPartial && !response.isRunning) {
                if (!didCancel) {
                  const stringifyIndices = response.indicesExists.sort().join();
                  previousIndexesName.current = response.indicesExists;
                  dispatch(
                    sourcererActions.setSource({
                      id: sourcererScopeName,
                      payload: {
                        allExistingIndexPatterns: response.indicesExists.sort(),
                        browserFields: getBrowserFields(stringifyIndices, response.indexFields),
                        docValueFields: getDocValueFields2(stringifyIndices, response.indexFields),
                        errorMessage: null,
                        id: sourcererScopeName,
                        indexPattern: getIndexFields(stringifyIndices, response.indexFields),
                        indicesExist: response.indicesExists.length > 0,
                        loading: false,
                      },
                    })
                  );
                }
                searchSubscription$.unsubscribe();
              } else if (!didCancel && response.isPartial && !response.isRunning) {
                // TODO: Make response error status clearer
                setLoading(false);
                notifications.toasts.addWarning(i18n.ERROR_BEAT_FIELDS);
                searchSubscription$.unsubscribe();
              }
            },
            error: (msg) => {
              if (!didCancel) {
                setLoading(false);
              }

              if (!(msg instanceof AbortError)) {
                notifications.toasts.addDanger({
                  text: msg.message,
                  title: i18n.FAIL_BEAT_FIELDS,
                });
              }
            },
          });
      };
      abortCtrl.current.abort();
      asyncSearch();
      return () => {
        didCancel = true;
        abortCtrl.current.abort();
      };
    },
    [data.search, dispatch, notifications.toasts, setLoading, sourcererScopeName]
  );

  useEffect(() => {
    if (indexNames.length > 0 && !isEqual(previousIndexesName.current, indexNames)) {
      indexFieldsSearch(indexNames);
    }
  }, [indexNames, indexFieldsSearch, previousIndexesName]);
};
