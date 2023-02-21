/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { Subscription } from 'rxjs';
import { useDispatch } from 'react-redux';
import memoizeOne from 'memoize-one';
import { omit, pick } from 'lodash/fp';
import type {
  BrowserField,
  IndexField,
  IndexFieldsStrategyRequest,
  IndexFieldsStrategyResponse,
} from '@kbn/timelines-plugin/common';
import { DELETED_SECURITY_SOLUTION_DATA_VIEW } from '@kbn/timelines-plugin/common';
import type { FieldSpec } from '@kbn/data-plugin/common';
import { isCompleteResponse, isErrorResponse } from '@kbn/data-plugin/common';
import { useKibana } from '../../lib/kibana';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { sourcererActions } from '../../store/sourcerer';
import * as i18n from './translations';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { getSourcererDataView } from '../sourcerer/get_sourcerer_data_view';
import { useTrackHttpRequest } from '../../lib/apm/use_track_http_request';
import { APP_UI_ID } from '../../../../common/constants';

export type IndexFieldSearch = (param: {
  dataViewId: string;
  scopeId?: SourcererScopeName;
  needToBeInit?: boolean;
  cleanCache?: boolean;
  skipScopeUpdate?: boolean;
}) => Promise<void>;

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
export const getDataViewStateFromIndexFields = memoizeOne(
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

export const useDataView = (): {
  indexFieldsSearch: IndexFieldSearch;
} => {
  const { data } = useKibana().services;
  const abortCtrl = useRef<Record<string, AbortController>>({});
  const searchSubscription$ = useRef<Record<string, Subscription>>({});
  const dispatch = useDispatch();
  const { addError, addWarning } = useAppToasts();
  const { startTracking } = useTrackHttpRequest();

  const setLoading = useCallback(
    ({ id, loading }: { id: string; loading: boolean }) => {
      dispatch(sourcererActions.setDataViewLoading({ id, loading }));
    },
    [dispatch]
  );
  const indexFieldsSearch = useCallback<IndexFieldSearch>(
    ({
      dataViewId,
      scopeId = SourcererScopeName.default,
      needToBeInit = false,
      cleanCache = false,
      skipScopeUpdate = false,
    }) => {
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

        const { endTracking } = startTracking({ name: `${APP_UI_ID} indexFieldsSearch` });

        if (needToBeInit) {
          const dataView = await getSourcererDataView(dataViewId, data.dataViews);
          dispatch(sourcererActions.setDataView(dataView));
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
                  endTracking('success');

                  const patternString = response.indicesExist.sort().join();
                  if (needToBeInit && scopeId && !skipScopeUpdate) {
                    dispatch(
                      sourcererActions.setSelectedDataView({
                        id: scopeId,
                        selectedDataViewId: dataViewId,
                        selectedPatterns: response.indicesExist,
                      })
                    );
                  }

                  if (cleanCache) {
                    getDataViewStateFromIndexFields.clear();
                  }
                  const dataViewInfo = getDataViewStateFromIndexFields(
                    patternString,
                    response.indexFields
                  );

                  dispatch(
                    sourcererActions.setDataView({
                      ...dataViewInfo,
                      id: dataViewId,
                      loading: false,
                      runtimeMappings: response.runtimeMappings,
                    })
                  );
                } else if (isErrorResponse(response)) {
                  endTracking('invalid');
                  setLoading({ id: dataViewId, loading: false });
                  addWarning(i18n.ERROR_BEAT_FIELDS);
                }
                unsubscribe();
                resolve();
              },
              error: (msg) => {
                endTracking('error');
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
    [addError, addWarning, data.search, dispatch, setLoading, startTracking, data.dataViews]
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
