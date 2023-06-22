/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isEqual, keyBy, pick } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DataViewBase } from '@kbn/es-query';
import type { BrowserField, BrowserFields } from '@kbn/timelines-plugin/common';
import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';

import { useKibana } from '../../lib/kibana';
import * as i18n from './translations';
import { getDataViewStateFromIndexFields } from './use_data_view';
import { useAppToasts } from '../../hooks/use_app_toasts';
import type { ENDPOINT_FIELDS_SEARCH_STRATEGY } from '../../../../common/endpoint/constants';

export type { BrowserField, BrowserFields };

export function getAllBrowserFields(browserFields: BrowserFields): Array<Partial<BrowserField>> {
  const result: Array<Partial<BrowserField>> = [];
  for (const namespace of Object.values(browserFields)) {
    if (namespace.fields) {
      result.push(...Object.values(namespace.fields));
    }
  }
  return result;
}

/**
 * @deprecated use EcsFlat from `@kbn/ecs`
 * @param browserFields
 * @returns
 */
export const getAllFieldsByName = (
  browserFields: BrowserFields
): { [fieldName: string]: Partial<BrowserField> } =>
  keyBy('name', getAllBrowserFields(browserFields));

export const getIndexFields = memoizeOne(
  (title: string, fields: DataViewFieldMap): DataViewBase =>
    fields && Object.keys(fields).length > 0
      ? {
          fields: Object.keys(fields).map((fieldName) =>
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
              fields[fieldName]
            )
          ),
          title,
        }
      : { fields: [], title },
  (newArgs, lastArgs) => newArgs[0] === lastArgs[0] && newArgs[1].length === lastArgs[1].length
);

const DEFAULT_BROWSER_FIELDS = {};
const DEFAULT_INDEX_PATTERNS = { fields: [], title: '' };
interface FetchIndexReturn {
  /**
   * @deprecated use fields list on dataview / "indexPattern"
   * about to use browserFields? Reconsider! Maybe you can accomplish
   * everything you need via the `fields` property on the data view
   * you are working with? Or perhaps you need a description for a
   * particular field? Consider using the EcsFlat module from `@kbn/ecs`
   */
  browserFields: BrowserFields;
  indexes: string[];
  indexExists: boolean;
  /**
   * @deprecated use dataViewSpec
   */
  indexPatterns: DataViewBase;
  /**
   * This variable should be renamed dataViewSpec and should have it's types
   * updated upstream but we will save that for some other time
   */
  dataView: DataViewSpec | undefined;
  dataViewSpec: DataViewSpec | undefined;
}

/**
 * Independent index fields hook/request
 * returns state directly, no redux
 */
export const useFetchIndex = (
  indexNamesOrDvId: string | string[],
  onlyCheckIfIndicesExist: boolean = false,
  strategy: 'indexFields' | 'dataView' | typeof ENDPOINT_FIELDS_SEARCH_STRATEGY = 'indexFields'
): [boolean, FetchIndexReturn] => {
  const { data } = useKibana().services;
  const abortCtrl = useRef(new AbortController());
  const previousIndexesNameOrId = useRef<string[] | string | undefined>([]);
  const isIndexNameArray = Array.isArray(indexNamesOrDvId);

  const defaultIndexesArray = useMemo(
    () => (isIndexNameArray ? indexNamesOrDvId : []),
    [indexNamesOrDvId, isIndexNameArray]
  );

  const [state, setState] = useState<FetchIndexReturn & { loading: boolean }>({
    browserFields: DEFAULT_BROWSER_FIELDS,
    indexes: defaultIndexesArray,
    indexExists: true,
    /**
     * @deprecated use dataViewSpec
     */
    indexPatterns: DEFAULT_INDEX_PATTERNS,
    dataView: undefined,
    dataViewSpec: undefined,
    loading: false,
  });
  const { addError } = useAppToasts();

  const indexFieldsSearch = useCallback(
    (iNames) => {
      const asyncSearch = async () => {
        try {
          setState({ ...state, loading: true });
          abortCtrl.current = new AbortController();
          let dataView: DataViewSpec;
          if (!isIndexNameArray) {
            const fulldv = await data.dataViews.get(indexNamesOrDvId);
            dataView = fulldv.toSpec();
            previousIndexesNameOrId.current = dataView?.id;
          } else {
            const dv = await data.dataViews.create({ title: iNames.join(','), allowNoIndex: true });
            // console.error(dv.fields);
            dataView = dv.toSpec();
          }

          const { browserFields } = getDataViewStateFromIndexFields(iNames, dataView.fields);
          previousIndexesNameOrId.current = dataView?.title?.split(',');

          setState({
            loading: false,
            dataView,
            dataViewSpec: dataView,
            browserFields,
            indexes: dataView?.title?.split(',') ?? [],
            indexExists: dataView?.title != null && dataView.title.split(',').length > 0,
            indexPatterns: getIndexFields(dataView?.title ?? '', dataView?.fields ?? {}),
          });
        } catch (exc) {
          setState({
            browserFields: DEFAULT_BROWSER_FIELDS,
            indexes: defaultIndexesArray,
            indexExists: true,
            indexPatterns: DEFAULT_INDEX_PATTERNS,
            dataView: undefined,
            dataViewSpec: undefined,
            loading: false,
          });
          addError(exc?.message, { title: i18n.ERROR_INDEX_FIELDS_SEARCH });
        }
      };

      asyncSearch();
    },
    [addError, data.dataViews, defaultIndexesArray, indexNamesOrDvId, isIndexNameArray, state]
  );

  useEffect(() => {
    if (!isEmpty(indexNamesOrDvId) && !isEqual(previousIndexesNameOrId.current, indexNamesOrDvId)) {
      indexFieldsSearch(indexNamesOrDvId);
    }
    return () => {
      abortCtrl.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexNamesOrDvId, previousIndexesNameOrId]);

  return [state.loading, state];
};
