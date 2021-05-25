/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy, pick, isEmpty, isEqual, isUndefined } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { IIndexPattern } from 'src/plugins/data/public';
import { Subscription } from 'rxjs';

import { useKibana } from '../../lib/kibana';
import {
  IndexField,
  IndexFieldsStrategyResponse,
  IndexFieldsStrategyRequest,
  BrowserField,
  BrowserFields,
} from '../../../../common/search_strategy/index_fields';
import { isErrorResponse, isCompleteResponse } from '../../../../../../../src/plugins/data/common';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import * as i18n from './translations';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { sourcererActions, sourcererSelectors } from '../../store/sourcerer';
import { DocValueFields } from '../../../../common/search_strategy/common';
import { useAppToasts } from '../../hooks/use_app_toasts';

export { BrowserField, BrowserFields, DocValueFields };

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

/**
 * HOT Code path where the fields can be 16087 in length or larger. This is
 * VERY mutatious on purpose to improve the performance of the transform.
 */
export const getBrowserFields = memoizeOne(
  (_title: string, fields: IndexField[]): BrowserFields => {
    // Adds two dangerous casts to allow for mutations within this function
    type DangerCastForMutation = Record<string, {}>;
    type DangerCastForBrowserFieldsMutation = Record<
      string,
      Omit<BrowserField, 'fields'> & { fields: Record<string, BrowserField> }
    >;

    // We mutate this instead of using lodash/set to keep this as fast as possible
    return fields.reduce<DangerCastForBrowserFieldsMutation>((accumulator, field) => {
      if (accumulator[field.category] == null) {
        (accumulator as DangerCastForMutation)[field.category] = {};
      }
      if (accumulator[field.category].fields == null) {
        accumulator[field.category].fields = {};
      }
      accumulator[field.category].fields[field.name] = (field as unknown) as BrowserField;
      return accumulator;
    }, {});
  },
  // Update the value only if _title has changed
  (newArgs, lastArgs) => newArgs[0] === lastArgs[0]
);

export const getDocValueFields = memoizeOne(
  (_title: string, fields: IndexField[]): DocValueFields[] =>
    fields && fields.length > 0
      ? fields.reduce<DocValueFields[]>((accumulator: DocValueFields[], field: IndexField) => {
          if (field.readFromDocValues && accumulator.length < 100) {
            return [
              ...accumulator,
              {
                field: field.name,
                format: field.format ? field.format : undefined,
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

const DEFAULT_BROWSER_FIELDS = {};
const DEFAULT_INDEX_PATTERNS = { fields: [], title: '' };
const DEFAULT_DOC_VALUE_FIELDS: DocValueFields[] = [];

interface FetchIndexReturn {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  indexes: string[];
  indexExists: boolean;
  indexPatterns: IIndexPattern;
}

export const useFetchIndex = (
  indexNames: string[],
  onlyCheckIfIndicesExist: boolean = false
): [boolean, FetchIndexReturn] => {
  const { data } = useKibana().services;
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const previousIndexesName = useRef<string[]>([]);
  const [isLoading, setLoading] = useState(false);

  const [state, setState] = useState<FetchIndexReturn>({
    browserFields: DEFAULT_BROWSER_FIELDS,
    docValueFields: DEFAULT_DOC_VALUE_FIELDS,
    indexes: indexNames,
    indexExists: true,
    indexPatterns: DEFAULT_INDEX_PATTERNS,
  });
  const { addError, addWarning } = useAppToasts();

  const indexFieldsSearch = useCallback(
    (iNames) => {
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);
        searchSubscription$.current = data.search
          .search<IndexFieldsStrategyRequest, IndexFieldsStrategyResponse>(
            { indices: iNames, onlyCheckIfIndicesExist },
            {
              abortSignal: abortCtrl.current.signal,
              strategy: 'securitySolutionIndexFields',
            }
          )
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                const stringifyIndices = response.indicesExist.sort().join();
                previousIndexesName.current = response.indicesExist;
                setLoading(false);
                setState({
                  browserFields: getBrowserFields(stringifyIndices, response.indexFields),
                  docValueFields: getDocValueFields(stringifyIndices, response.indexFields),
                  indexes: response.indicesExist,
                  indexExists: response.indicesExist.length > 0,
                  indexPatterns: getIndexFields(stringifyIndices, response.indexFields),
                });
                searchSubscription$.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_BEAT_FIELDS);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, {
                title: i18n.FAIL_BEAT_FIELDS,
              });
              searchSubscription$.current.unsubscribe();
            },
          });
      };
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
      asyncSearch();
    },
    [data.search, addError, addWarning, onlyCheckIfIndicesExist]
  );

  useEffect(() => {
    if (!isEmpty(indexNames) && !isEqual(previousIndexesName.current, indexNames)) {
      indexFieldsSearch(indexNames);
    }
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [indexNames, indexFieldsSearch, previousIndexesName]);

  return [isLoading, state];
};

export const useIndexFields = (sourcererScopeName: SourcererScopeName) => {
  const { data } = useKibana().services;
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const dispatch = useDispatch();
  const indexNamesSelectedSelector = useMemo(
    () => sourcererSelectors.getIndexNamesSelectedSelector(),
    []
  );
  const { indexNames, previousIndexNames } = useDeepEqualSelector<{
    indexNames: string[];
    previousIndexNames: string;
  }>((state) => indexNamesSelectedSelector(state, sourcererScopeName));
  const { addError, addWarning } = useAppToasts();

  const setLoading = useCallback(
    (loading: boolean) => {
      dispatch(sourcererActions.setSourcererScopeLoading({ id: sourcererScopeName, loading }));
    },
    [dispatch, sourcererScopeName]
  );

  const indexFieldsSearch = useCallback(
    (indicesName) => {
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);
        searchSubscription$.current = data.search
          .search<IndexFieldsStrategyRequest, IndexFieldsStrategyResponse>(
            { indices: indicesName, onlyCheckIfIndicesExist: false },
            {
              abortSignal: abortCtrl.current.signal,
              strategy: 'securitySolutionIndexFields',
            }
          )
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                const stringifyIndices = response.indicesExist.sort().join();
                dispatch(
                  sourcererActions.setSource({
                    id: sourcererScopeName,
                    payload: {
                      browserFields: getBrowserFields(stringifyIndices, response.indexFields),
                      docValueFields: getDocValueFields(stringifyIndices, response.indexFields),
                      errorMessage: null,
                      id: sourcererScopeName,
                      indexPattern: getIndexFields(stringifyIndices, response.indexFields),
                      indicesExist: response.indicesExist.length > 0,
                      loading: false,
                    },
                  })
                );
                searchSubscription$.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_BEAT_FIELDS);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, {
                title: i18n.FAIL_BEAT_FIELDS,
              });
              searchSubscription$.current.unsubscribe();
            },
          });
      };
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
      asyncSearch();
    },
    [data.search, dispatch, addError, addWarning, setLoading, sourcererScopeName]
  );

  useEffect(() => {
    if (!isEmpty(indexNames) && previousIndexNames !== indexNames.sort().join()) {
      indexFieldsSearch(indexNames);
    }
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [indexNames, indexFieldsSearch, previousIndexNames]);
};
