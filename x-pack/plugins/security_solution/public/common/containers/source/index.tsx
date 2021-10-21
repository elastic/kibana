/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isEqual, isUndefined, keyBy, pick } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { IIndexPattern } from 'src/plugins/data/public';
import { Subscription } from 'rxjs';

import { useKibana } from '../../lib/kibana';
import {
  BrowserField,
  BrowserFields,
  DELETED_SECURITY_SOLUTION_DATA_VIEW,
  DocValueFields,
  IndexField,
  IndexFieldsStrategyRequest,
  IndexFieldsStrategyResponse,
} from '../../../../../timelines/common';
import { isCompleteResponse, isErrorResponse } from '../../../../../../../src/plugins/data/common';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import * as i18n from './translations';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { sourcererActions, sourcererSelectors } from '../../store/sourcerer';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { SelectedDataView } from '../../store/sourcerer/selectors';

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
      accumulator[field.category].fields[field.name] = field as unknown as BrowserField;
      return accumulator;
    }, {});
  },
  (newArgs, lastArgs) => newArgs[0] === lastArgs[0] && newArgs[1].length === lastArgs[1].length
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
              },
            ];
          }
          return accumulator;
        }, [])
      : [],
  (newArgs, lastArgs) => newArgs[0] === lastArgs[0] && newArgs[1].length === lastArgs[1].length
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

/**
 * Independent index fields hook/request
 * returns state directly, no redux
 */
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
          .search<IndexFieldsStrategyRequest<'indices'>, IndexFieldsStrategyResponse>(
            { indices: iNames, onlyCheckIfIndicesExist },
            {
              abortSignal: abortCtrl.current.signal,
              strategy: 'indexFields',
            }
          )
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                const stringifyIndices = response.indicesExist.sort().join();

                previousIndexesName.current = response.indicesExist;
                setLoading(false);
                // TODO: Steph/sourcerer all the below formatting should be happening serverside
                // https://github.com/elastic/security-team/issues/1730
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
    [data.search, addError, addWarning, onlyCheckIfIndicesExist, setLoading, setState]
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

/**
 * Sourcerer specific index fields hook/request
 * sets redux state, returns nothing
 *
 * @param autoCall - When false it doesn't call `indexFieldsSearch` automacally.
 */
export const useIndexFields = (
  sourcererScopeName: SourcererScopeName,
  autoCall = true
): { indexFieldsSearch: (selectedDataViewId: string, newSignalsIndex?: string) => void } => {
  const { data } = useKibana().services;
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const dispatch = useDispatch();
  const getSelectedDataView = useMemo(() => sourcererSelectors.getSelectedDataViewSelector(), []);
  const { dataViewId, patternList, selectedPatterns } = useDeepEqualSelector<SelectedDataView>(
    (state) => getSelectedDataView(state, sourcererScopeName)
  );
  const { addError, addWarning } = useAppToasts();

  const setLoading = useCallback(
    (loading: boolean) => {
      dispatch(sourcererActions.setSourcererScopeLoading({ id: sourcererScopeName, loading }));
    },
    [dispatch, sourcererScopeName]
  );

  const getSignalIndexNameSelector = useMemo(
    () => sourcererSelectors.signalIndexNameSelector(),
    []
  );
  const signalIndexNameSelector = useDeepEqualSelector(getSignalIndexNameSelector);

  const indexFieldsSearch = useCallback(
    (selectedDataViewId: string, newSignalsIndex?: string) => {
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);
        searchSubscription$.current = data.search
          .search<IndexFieldsStrategyRequest<'dataView'>, IndexFieldsStrategyResponse>(
            {
              dataViewId: selectedDataViewId,
              onlyCheckIfIndicesExist: false,
            },
            {
              abortSignal: abortCtrl.current.signal,
              strategy: 'indexFields',
            }
          )
          .subscribe({
            next: (response) => {
              // TODO: Steph/sourcerer needs better tests
              if (isCompleteResponse(response)) {
                const signalIndexName = signalIndexNameSelector
                  ? signalIndexNameSelector
                  : newSignalsIndex ?? '';
                const newSelectedPatterns = selectedPatterns.filter((pattern) =>
                  patternList.includes(pattern)
                );
                const patternString = newSelectedPatterns.sort().join();

                if (newSignalsIndex != null) {
                  // if new signal index name is set, there wasn't one before so we need to update detections specifically
                  // technically, we need to update all scopes as there can be new fields in signals index
                  // once fields are moved to sourcerer.kibanaDataViews we only need to do this for detections scope
                  // TODO: Steph/sourcerer https://github.com/elastic/security-team/issues/1730 to be done before 7.16 feature freeze
                  dispatch(
                    sourcererActions.setSource({
                      id: SourcererScopeName.detections,
                      payload: {
                        browserFields: getBrowserFields(patternString, response.indexFields),
                        docValueFields: getDocValueFields(patternString, response.indexFields),
                        errorMessage: null,
                        id: SourcererScopeName.detections,
                        indexPattern: getIndexFields(patternString, response.indexFields),
                        indicesExist: response.indicesExist.includes(signalIndexName),
                        loading: false,
                        runtimeMappings: response.runtimeMappings,
                      },
                    })
                  );
                } else {
                  dispatch(
                    sourcererActions.setSource({
                      id: sourcererScopeName,
                      payload: {
                        // TODO: Steph/sourcerer all the below formatting should be happening serverside
                        // https://github.com/elastic/security-team/issues/1730
                        browserFields: getBrowserFields(patternString, response.indexFields),
                        docValueFields: getDocValueFields(patternString, response.indexFields),
                        errorMessage: null,
                        id: sourcererScopeName,
                        indexPattern: getIndexFields(patternString, response.indexFields),
                        indicesExist:
                          // TODO: Steph/sourcerer needs test
                          sourcererScopeName === SourcererScopeName.detections
                            ? response.indicesExist.includes(signalIndexName)
                            : sourcererScopeName === SourcererScopeName.default
                            ? response.indicesExist.filter((i) => i !== signalIndexName).length > 0
                            : response.indicesExist.length > 0,
                        loading: false,
                        runtimeMappings: response.runtimeMappings,
                      },
                    })
                  );
                }
                searchSubscription$.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_BEAT_FIELDS);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              if (msg.message === DELETED_SECURITY_SOLUTION_DATA_VIEW) {
                // reload app if security solution data view is deleted
                return location.reload();
              }
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
    [
      addError,
      addWarning,
      data.search,
      dispatch,
      patternList,
      selectedPatterns,
      setLoading,
      signalIndexNameSelector,
      sourcererScopeName,
    ]
  );
  const refDataViewId = useRef('');
  const refSelectedPatterns = useRef([] as string[]);
  const refSourcererScopeName = useRef('');

  useEffect(() => {
    if (
      autoCall &&
      ((dataViewId != null &&
        // remove this when https://github.com/elastic/kibana/pull/114907 is merged
        sourcererScopeName !== refSourcererScopeName.current) ||
        (dataViewId !== refDataViewId.current && selectedPatterns.length > 0) ||
        (selectedPatterns.length > 0 && refSelectedPatterns.current.length === 0))
    ) {
      indexFieldsSearch(dataViewId);
    }
    refSourcererScopeName.current = sourcererScopeName;
    refSelectedPatterns.current = selectedPatterns;
    refDataViewId.current = dataViewId;
  }, [dataViewId, indexFieldsSearch, selectedPatterns, sourcererScopeName, autoCall]);

  useEffect(() => {
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, []);

  return { indexFieldsSearch };
};
