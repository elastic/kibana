/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef } from 'react';
import type { Subscription } from 'rxjs';
import { useDispatch } from 'react-redux';
import memoizeOne from 'memoize-one';
import { pick } from 'lodash/fp';
import type { BrowserField } from '@kbn/timelines-plugin/common';
import type { FieldSpec } from '@kbn/data-plugin/common';
import type { IIndexPatternFieldList } from '@kbn/data-views-plugin/common';
import { getCategory } from '@kbn/triggers-actions-ui-plugin/public/application/sections/field_browser/helpers';

import { useKibana } from '../../lib/kibana';
import { sourcererActions } from '../../store/sourcerer';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { getSourcererDataView } from '../sourcerer/get_sourcerer_data_view';

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
  (
    _title: string,
    fields: IIndexPatternFieldList,
    _includeUnmapped: boolean = false
  ): DataViewInfo => {
    // Adds two dangerous casts to allow for mutations within this function
    type DangerCastForMutation = Record<string, {}>;

    return fields.reduce<DataViewInfo>(
      (acc, field) => {
        // mutate browserFields
        const category = getCategory(field.name);
        if (acc.browserFields[category] == null) {
          (acc.browserFields as DangerCastForMutation)[category] = {};
        }
        if (acc.browserFields[category].fields == null) {
          acc.browserFields[category].fields = {};
        }
        acc.browserFields[category].fields[field.name] = field as unknown as BrowserField;

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
      const asyncSearch = async () => {
        abortCtrl.current = {
          ...abortCtrl.current,
          [dataViewId]: new AbortController(),
        };
        setLoading({ id: dataViewId, loading: true });

        const dataView = await getSourcererDataView(dataViewId, data.dataViews, cleanCache);

        if (needToBeInit) {
          dispatch(sourcererActions.setDataView({ ...dataView, loading: false }));
        } else {
          if (needToBeInit && scopeId && !skipScopeUpdate) {
            dispatch(
              sourcererActions.setSelectedDataView({
                id: scopeId,
                selectedDataViewId: dataViewId,
                selectedPatterns: dataView.patternList,
              })
            );
          }
          dispatch(sourcererActions.setDataView({ ...dataView, loading: false }));
        }
      };
      if (searchSubscription$.current[dataViewId]) {
        searchSubscription$.current[dataViewId].unsubscribe();
      }
      if (abortCtrl.current[dataViewId]) {
        abortCtrl.current[dataViewId].abort();
      }
      return asyncSearch();
    },
    [dispatch, setLoading, data.dataViews]
  );

  return { indexFieldsSearch };
};
