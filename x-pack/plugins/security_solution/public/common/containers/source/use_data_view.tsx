/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import { Subscription } from 'rxjs';
import { useDispatch } from 'react-redux';
import memoizeOne from 'memoize-one';
import { pick } from 'lodash/fp';
import { useKibana } from '../../lib/kibana';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { sourcererActions } from '../../store/sourcerer';
import {
  DELETED_SECURITY_SOLUTION_DATA_VIEW,
  IndexField,
  IndexFieldsStrategyRequest,
  IndexFieldsStrategyResponse,
} from '../../../../../timelines/common';
import {
  FieldSpec,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../src/plugins/data/common';
import * as i18n from './translations';
import { getBrowserFields, getDocValueFields } from './';

export const indexFieldToFieldSpec = (field: IndexField): FieldSpec =>
  pick(['name', 'searchable', 'type', 'aggregatable', 'esTypes', 'subType'], field);

const getEsFields = memoizeOne(
  (fields: IndexField[]): FieldSpec[] =>
    fields && fields.length > 0 ? fields.map(indexFieldToFieldSpec) : [],
  (newArgs, lastArgs) => newArgs[0].length === lastArgs[0].length
);

export const useDataView = (): { indexFieldsSearch: (selectedDataViewId: string) => void } => {
  const { data } = useKibana().services;
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const dispatch = useDispatch();
  const { addError, addWarning } = useAppToasts();

  const setLoading = useCallback(
    ({ id, loading }: { id: string; loading: boolean }) => {
      dispatch(sourcererActions.setDataViewLoading({ id, loading }));
    },
    [dispatch]
  );

  const indexFieldsSearch = useCallback(
    (selectedDataViewId: string) => {
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading({ id: selectedDataViewId, loading: true });

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
              if (isCompleteResponse(response)) {
                const patternString = response.indicesExist.sort().join();

                dispatch(
                  sourcererActions.setDataView({
                    browserFields: getBrowserFields(patternString, response.indexFields),
                    docValueFields: getDocValueFields(patternString, response.indexFields),
                    id: selectedDataViewId,
                    indexFields: getEsFields(response.indexFields),
                    loading: false,
                    runtimeMappings: response.runtimeMappings,
                  })
                );
                searchSubscription$.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading({ id: selectedDataViewId, loading: false });
                addWarning(i18n.ERROR_BEAT_FIELDS);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              if (msg.message === DELETED_SECURITY_SOLUTION_DATA_VIEW) {
                // reload app if security solution data view is deleted
                return location.reload();
              }
              setLoading({ id: selectedDataViewId, loading: false });
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
    [addError, addWarning, data.search, dispatch, setLoading]
  );

  useEffect(() => {
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, []);

  return { indexFieldsSearch };
};
