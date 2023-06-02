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
import type { DataViewFieldMap, FieldSpec } from '@kbn/data-views-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';

import { useKibana } from '../../lib/kibana';
import * as i18n from './translations';
import { getDataViewStateFromIndexFields } from './use_data_view';
import { useAppToasts } from '../../hooks/use_app_toasts';

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
  (
    title: string,
    fields: DataViewFieldMap,
    _includeUnmapped: boolean = false
  ): { fields: FieldSpec[]; title: string } =>
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
  (newArgs, lastArgs) =>
    newArgs[0] === lastArgs[0] &&
    newArgs[1].length === lastArgs[1].length &&
    newArgs[2] === lastArgs[2]
);

const DEFAULT_BROWSER_FIELDS = {};
const DEFAULT_INDEX_PATTERNS = { fields: [], title: '' };
interface FetchIndexReturn {
  /**
   * @deprecated use fields list on `dataView`
   * about to use browserFields? Reconsider! Maybe you can accomplish
   * everything you need via the `fields` property on the data view
   * you are working with? Or perhaps you need a description for a
   * particular field? Consider using the EcsFlat module from `@kbn/ecs`
   */
  browserFields: BrowserFields;
  indexes: string[];
  indexExists: boolean;
  indexPatterns: DataViewBase;
  dataView: DataViewSpec;
}

/**
 * Independent index fields hook/request
 * returns state directly, no redux
 */
export const useFetchIndex = (
  dataViewIdOrIndexNames: string | string[],
  includeUnmapped: boolean = false
): [boolean, FetchIndexReturn] => {
  const { data } = useKibana().services;
  const abortCtrl = useRef(new AbortController());
  const previousIndexesNameOrId = useRef<string[] | string | undefined>([]);
  const isIndexNameArray = Array.isArray(dataViewIdOrIndexNames);

  const defaultIndexesArray = useMemo(
    () => (isIndexNameArray ? dataViewIdOrIndexNames : []),
    [dataViewIdOrIndexNames, isIndexNameArray]
  );

  const [state, setState] = useState<FetchIndexReturn & { loading: boolean }>({
    browserFields: DEFAULT_BROWSER_FIELDS,
    indexes: defaultIndexesArray,
    indexExists: true,
    indexPatterns: DEFAULT_INDEX_PATTERNS,
    dataView: {},
    loading: false,
  });
  const { addError, addWarning } = useAppToasts();

  const indexFieldsSearch = useCallback(
    (iNames) => {
      const asyncSearch = async () => {
        try {
          setState({ ...state, loading: true });
          abortCtrl.current = new AbortController();
          let dv: DataViewSpec;
          if (!isIndexNameArray) {
            const fulldv = await data.dataViews.get(dataViewIdOrIndexNames);
            dv = fulldv.toSpec();
            previousIndexesNameOrId.current = dv?.id;
          } else {
            const fulldv = await data.dataViews.create({
              title: iNames.join(','),
              allowNoIndex: true,
            });
            dv = fulldv.toSpec();
            previousIndexesNameOrId.current = dv?.title?.split(',');
          }

          if (includeUnmapped && dv.fields != null) {
            try {
              const fieldNameConflictDescriptionsMap =
                await data.dataViews.getFieldsForIndexPattern(dv, {
                  pattern: '',
                  includeUnmapped: true,
                });
              fieldNameConflictDescriptionsMap.forEach((field) => {
                if (dv?.fields?.[field.name] != null) {
                  dv.fields[field.name] = { ...field };
                }
              });
            } catch (error) {
              addWarning(error, { title: i18n.FETCH_FIELDS_WITH_UNMAPPED_DATA_ERROR });
            }
          }
          const { browserFields } = getDataViewStateFromIndexFields(
            iNames,
            dv.fields,
            includeUnmapped
          );

          setState({
            loading: false,
            dataView: dv,
            browserFields,
            indexes: dv?.title != null ? dv.title.split(',') : [],
            indexExists: dv?.title != null && dv?.title?.split(',').length > 0,
            indexPatterns:
              dv.title != null && dv.fields != null
                ? getIndexFields(dv?.title, dv?.fields, includeUnmapped)
                : { title: '', fields: [] },
          });
        } catch (exc) {
          setState({
            ...state,
            loading: false,
          });
          addError(exc?.message, { title: i18n.ERROR_INDEX_FIELDS_SEARCH });
        }
      };

      asyncSearch();
    },
    [
      addError,
      addWarning,
      data.dataViews,
      dataViewIdOrIndexNames,
      includeUnmapped,
      isIndexNameArray,
      state,
    ]
  );

  useEffect(() => {
    if (
      !isEmpty(dataViewIdOrIndexNames) &&
      !isEqual(previousIndexesNameOrId.current, dataViewIdOrIndexNames)
    ) {
      indexFieldsSearch(dataViewIdOrIndexNames);
    }
    return () => {
      abortCtrl.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataViewIdOrIndexNames, previousIndexesNameOrId]);

  return [state.loading, state];
};
