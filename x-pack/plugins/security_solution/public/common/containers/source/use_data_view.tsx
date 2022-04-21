/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import { Subscription } from 'rxjs';
import { useDispatch } from 'react-redux';
import { omit } from 'lodash/fp';
import {
  DELETED_SECURITY_SOLUTION_DATA_VIEW,
  IndexFieldsStrategyRequest,
  IndexFieldsStrategyResponse,
} from '@kbn/timelines-plugin/common';
import { isCompleteResponse, isErrorResponse } from '@kbn/data-plugin/common';
import { useKibana } from '../../lib/kibana';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { sourcererActions } from '../../store/sourcerer';
import * as i18n from './translations';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { getSourcererDataView } from '../sourcerer/api';

export type IndexFieldSearch = (param: {
  dataViewId: string;
  scopeId?: SourcererScopeName;
  needToBeInit?: boolean;
}) => Promise<void>;

export const useDataView = (): {
  indexFieldsSearch: IndexFieldSearch;
} => {
  const { data } = useKibana().services;
  const abortCtrl = useRef<Record<string, AbortController>>({});
  const searchSubscription$ = useRef<Record<string, Subscription>>({});
  const dispatch = useDispatch();
  const { addError, addWarning } = useAppToasts();

  const setLoading = useCallback(
    ({ id, loading }: { id: string; loading: boolean }) => {
      dispatch(sourcererActions.setDataViewLoading({ id, loading }));
    },
    [dispatch]
  );
  const indexFieldsSearch = useCallback<IndexFieldSearch>(
    ({ dataViewId, scopeId = SourcererScopeName.default, needToBeInit = false }) => {
      const unsubscribe = () => {
        searchSubscription$.current[dataViewId]?.unsubscribe();
        searchSubscription$.current = omit(dataViewId, searchSubscription$.current);
        abortCtrl.current = omit(dataViewId, abortCtrl.current);
      };

      const asyncSearch = async () => {
        abortCtrl.current = {
          ...abortCtrl.current,
          [dataViewId]: new AbortController(),
        };
        setLoading({ id: dataViewId, loading: true });
        if (needToBeInit) {
          const dataViewToUpdate = await getSourcererDataView(
            dataViewId,
            abortCtrl.current[dataViewId].signal
          );
          dispatch(
            sourcererActions.updateSourcererDataViews({
              dataView: dataViewToUpdate,
            })
          );
        }

        return new Promise<void>((resolve) => {
          const subscription = data.search
            .search<IndexFieldsStrategyRequest<'dataView'>, IndexFieldsStrategyResponse>(
              {
                dataViewId,
                onlyCheckIfIndicesExist: false,
              },
              {
                abortSignal: abortCtrl.current[dataViewId].signal,
                strategy: 'indexFields',
              }
            )
            .subscribe({
              next: async (response) => {
                if (isCompleteResponse(response)) {
                  if (needToBeInit && scopeId) {
                    dispatch(
                      sourcererActions.setSelectedDataView({
                        id: scopeId,
                        selectedDataViewId: dataViewId,
                        selectedPatterns: response.indicesExist,
                      })
                    );
                  }

                  dispatch(
                    sourcererActions.setDataView({
                      ...response.formattedFields,
                      id: dataViewId,
                      loading: false,
                      runtimeMappings: response.runtimeMappings,
                    })
                  );
                } else if (isErrorResponse(response)) {
                  setLoading({ id: dataViewId, loading: false });
                  addWarning(i18n.ERROR_BEAT_FIELDS);
                }
                unsubscribe();
                resolve();
              },
              error: (msg) => {
                if (msg.message === DELETED_SECURITY_SOLUTION_DATA_VIEW) {
                  // reload app if security solution data view is deleted
                  return location.reload();
                }
                setLoading({ id: dataViewId, loading: false });
                addError(msg, {
                  title: i18n.FAIL_BEAT_FIELDS,
                });
                unsubscribe();
                resolve();
              },
            });
          searchSubscription$.current = {
            ...searchSubscription$.current,
            [dataViewId]: subscription,
          };
        });
      };
      if (searchSubscription$.current[dataViewId]) {
        searchSubscription$.current[dataViewId].unsubscribe();
      }
      if (abortCtrl.current[dataViewId]) {
        abortCtrl.current[dataViewId].abort();
      }
      return asyncSearch();
    },
    [addError, addWarning, data.search, dispatch, setLoading]
  );

  useEffect(() => {
    return () => {
      Object.values(searchSubscription$.current).forEach((subscription) =>
        subscription.unsubscribe()
      );
      Object.values(abortCtrl.current).forEach((signal) => signal.abort());
    };
  }, []);

  return { indexFieldsSearch };
};
