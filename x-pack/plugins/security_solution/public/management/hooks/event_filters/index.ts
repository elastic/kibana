/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Subscription } from 'rxjs';
import ReactDOM from 'react-dom';
import memoizeOne from 'memoize-one';
import { isEmpty, isEqual, pick } from 'lodash/fp';

import type { DataViewBase } from '@kbn/es-query';
import type {
  BrowserField,
  BrowserFields,
  IndexField,
  IndexFieldsStrategyRequest,
  IndexFieldsStrategyResponse,
} from '@kbn/timelines-plugin/common';
import type { FieldSpec } from '@kbn/data-plugin/common';
import { isCompleteResponse, isErrorResponse } from '@kbn/data-plugin/common';

import * as i18n from './translations';
import { ENDPOINT_FIELDS_SEARCH_STRATEGY } from '../../../../common/endpoint/constants';
import { useKibana } from '../../../common/lib/kibana';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';

const DEFAULT_BROWSER_FIELDS = {};
const DEFAULT_INDEX_PATTERNS = { fields: [], title: '' };

interface FetchIndexReturn {
  browserFields: BrowserFields;
  indexes: string[];
  indexExists: boolean;
  indexPatterns: DataViewBase;
}

type DangerCastForBrowserFieldsMutation = Record<
  string,
  Omit<BrowserField, 'fields'> & { fields: Record<string, BrowserField> }
>;
interface DataViewInfo {
  browserFields: DangerCastForBrowserFieldsMutation;
  indexFields: FieldSpec[];
}

/**
 * HOT Code path where the fields can be 16087 in length or larger. This is
 * VERY mutatious on purpose to improve the performance of the transform.
 */
const getDataViewStateFromIndexFields = memoizeOne(
  (_title: string, fields: IndexField[], _includeUnmapped: boolean = false): DataViewInfo => {
    // Adds two dangerous casts to allow for mutations within this function
    type DangerCastForMutation = Record<string, {}>;

    return fields.reduce<DataViewInfo>(
      (acc, field) => {
        // mutate browserFields
        if (acc.browserFields[field.category] == null) {
          (acc.browserFields as DangerCastForMutation)[field.category] = {};
        }
        if (acc.browserFields[field.category].fields == null) {
          acc.browserFields[field.category].fields = {};
        }
        acc.browserFields[field.category].fields[field.name] = field as unknown as BrowserField;

        // mutate indexFields
        acc.indexFields.push(
          pick(['name', 'searchable', 'type', 'aggregatable', 'esTypes', 'subType'], field)
        );

        return acc;
      },
      {
        browserFields: {},
        indexFields: [],
      }
    );
  },
  (newArgs, lastArgs) =>
    newArgs[0] === lastArgs[0] &&
    newArgs[1].length === lastArgs[1].length &&
    newArgs[2] === lastArgs[2]
);

export const getIndexFields = memoizeOne(
  (title: string, fields: IndexField[], _includeUnmapped: boolean = false): DataViewBase =>
    fields && fields.length > 0
      ? {
          fields: fields.map((field) =>
            pick(
              [
                'name',
                'searchable',
                'type',
                'aggregatable',
                'esTypes',
                'subType',
                'conflictDescriptions',
              ],
              field
            )
          ),
          title,
        }
      : { fields: [], title },
  (newArgs, lastArgs) =>
    newArgs[0] === lastArgs[0] &&
    newArgs[1].length === lastArgs[1].length &&
    newArgs[2] === lastArgs[2]
);

export function useFetchEventFiltersFields(
  indexNames: string[],
  onlyCheckIfIndicesExist: boolean = false,
  strategy: typeof ENDPOINT_FIELDS_SEARCH_STRATEGY = ENDPOINT_FIELDS_SEARCH_STRATEGY,
  includeUnmapped: boolean = false
): [boolean, FetchIndexReturn] {
  const { data } = useKibana().services;
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const previousIndexesName = useRef<string[]>([]);
  const [isLoading, setLoading] = useState(false);

  const [state, setState] = useState<FetchIndexReturn>({
    browserFields: DEFAULT_BROWSER_FIELDS,
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
            { indices: iNames, onlyCheckIfIndicesExist, includeUnmapped },
            {
              abortSignal: abortCtrl.current.signal,
              strategy,
            }
          )
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                Promise.resolve().then(() => {
                  ReactDOM.unstable_batchedUpdates(() => {
                    const stringifyIndices = response.indicesExist.sort().join();

                    previousIndexesName.current = response.indicesExist;
                    const { browserFields } = getDataViewStateFromIndexFields(
                      stringifyIndices,
                      response.indexFields,
                      includeUnmapped
                    );
                    setLoading(false);
                    setState({
                      browserFields,
                      indexes: response.indicesExist,
                      indexExists: response.indicesExist.length > 0,
                      indexPatterns: getIndexFields(
                        stringifyIndices,
                        response.indexFields,
                        includeUnmapped
                      ),
                    });

                    searchSubscription$.current.unsubscribe();
                  });
                });
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_BEAT_FIELDS(strategy));
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, {
                title: i18n.FAIL_BEAT_FIELDS(strategy),
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
      data.search,
      addError,
      addWarning,
      onlyCheckIfIndicesExist,
      includeUnmapped,
      setLoading,
      setState,
      strategy,
    ]
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
}
