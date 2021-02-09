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

import { useKibana } from '../../lib/kibana';
import {
  IndexField,
  IndexFieldsStrategyResponse,
  IndexFieldsStrategyRequest,
  BrowserField,
  BrowserFields,
} from '../../../../common/search_strategy/index_fields';
import { AbortError } from '../../../../../../../src/plugins/kibana_utils/common';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import * as i18n from './translations';
import { SelectablePatterns, SourcererScopeName } from '../../store/sourcerer/model';
import { sourcererActions, sourcererSelectors } from '../../store/sourcerer';
import { DocValueFields } from '../../../../common/search_strategy/common';

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
                format: field.format,
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
  selectedPatterns: SelectablePatterns,
  onlyCheckIfIndicesExist: boolean = false
): [boolean, FetchIndexReturn] => {
  const { data, notifications } = useKibana().services;
  const abortCtrl = useRef(new AbortController());
  const previousIndexesName = useRef<string[]>([]);
  const [isLoading, setLoading] = useState(false);

  const [state, setState] = useState<FetchIndexReturn>({
    browserFields: DEFAULT_BROWSER_FIELDS,
    docValueFields: DEFAULT_DOC_VALUE_FIELDS,
    indexes: selectedPatterns.map(({ title }) => title),
    indexExists: true,
    indexPatterns: DEFAULT_INDEX_PATTERNS,
  });

  const indexFieldsSearch = useCallback(
    (newSelectedPatterns) => {
      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);
        const searchSubscription$ = data.search
          .search<IndexFieldsStrategyRequest, IndexFieldsStrategyResponse>(
            { selectedPatterns: newSelectedPatterns, onlyCheckIfIndicesExist },
            {
              abortSignal: abortCtrl.current.signal,
              strategy: 'securitySolutionIndexFields',
            }
          )
          .subscribe({
            next: (response) => {
              if (!response.isPartial && !response.isRunning) {
                if (!didCancel) {
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
                }
                searchSubscription$.unsubscribe();
              } else if (!didCancel && response.isPartial && !response.isRunning) {
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
    [data.search, notifications.toasts, onlyCheckIfIndicesExist]
  );

  useEffect(() => {
    if (
      !isEmpty(selectedPatterns) &&
      !isEqual(
        previousIndexesName.current,
        selectedPatterns.map(({ title }) => title)
      )
    ) {
      indexFieldsSearch(selectedPatterns);
    }
  }, [selectedPatterns, indexFieldsSearch, previousIndexesName]);

  return [isLoading, state];
};

export const useIndexFields = (sourcererScopeName: SourcererScopeName) => {
  const { data, notifications } = useKibana().services;
  const abortCtrl = useRef(new AbortController());
  const dispatch = useDispatch();
  const indexPatternsSelectedSelector = useMemo(
    () => sourcererSelectors.getIndexPatternsSelectedSelector(),
    []
  );
  const { selectedPatterns } = useDeepEqualSelector<{
    selectedPatterns: SelectablePatterns;
  }>((state) => indexPatternsSelectedSelector(state, sourcererScopeName));

  const setLoading = useCallback(
    (loading: boolean) => {
      dispatch(sourcererActions.setSourcererScopeLoading({ id: sourcererScopeName, loading }));
    },
    [dispatch, sourcererScopeName]
  );

  const indexFieldsSearch = useCallback(
    (selectedPatterns) => {
      let didCancel = false;
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);
        const searchSubscription$ = data.search
          .search<IndexFieldsStrategyRequest, IndexFieldsStrategyResponse>(
            { selectedPatterns, onlyCheckIfIndicesExist: false },
            {
              abortSignal: abortCtrl.current.signal,
              strategy: 'securitySolutionIndexFields',
            }
          )
          .subscribe({
            next: (response) => {
              if (!response.isPartial && !response.isRunning) {
                if (!didCancel) {
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
    //  && previousIndexNames !== selectedPatterns.sort().join()
    if (!isEmpty(selectedPatterns)) {
      indexFieldsSearch(selectedPatterns);
    }
  }, [selectedPatterns, indexFieldsSearch]);
};
