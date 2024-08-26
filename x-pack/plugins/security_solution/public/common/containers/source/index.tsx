/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isEqual, keyBy, pick } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataViewBase } from '@kbn/es-query';
import type { BrowserFields } from '@kbn/timelines-plugin/common';
import type { FieldSpec, IIndexPatternFieldList } from '@kbn/data-views-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';

import { useKibana } from '../../lib/kibana';
import * as i18n from './translations';
import { getDataViewStateFromIndexFields } from './use_data_view';
import { useAppToasts } from '../../hooks/use_app_toasts';
import type { ENDPOINT_FIELDS_SEARCH_STRATEGY } from '../../../../common/endpoint/constants';

export type { BrowserFields };

export function getAllBrowserFields(browserFields: BrowserFields): Array<Partial<FieldSpec>> {
  const result: Array<Partial<FieldSpec>> = [];
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
): { [fieldName: string]: Partial<FieldSpec> } => keyBy('name', getAllBrowserFields(browserFields));

export const getIndexFields = memoizeOne(
  (title: string, fields: IIndexPatternFieldList): DataViewBase =>
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
  indexPatterns: DataViewBase;
  dataView: DataViewSpec | undefined;
}

/**
 * Independent index fields hook/request
 * returns state directly, no redux
 */
export const useFetchIndex = (
  indexNames: string[],
  onlyCheckIfIndicesExist: boolean = false,
  strategy: 'indexFields' | 'dataView' | typeof ENDPOINT_FIELDS_SEARCH_STRATEGY = 'indexFields'
): [boolean, FetchIndexReturn] => {
  const { data } = useKibana().services;
  const abortCtrl = useRef(new AbortController());
  const previousIndexesName = useRef<string[]>([]);

  const [state, setState] = useState<FetchIndexReturn & { loading: boolean }>({
    browserFields: DEFAULT_BROWSER_FIELDS,
    indexes: indexNames,
    indexExists: true,
    indexPatterns: DEFAULT_INDEX_PATTERNS,
    dataView: undefined,
    loading: false,
  });
  const { addError } = useAppToasts();

  const indexFieldsSearch = useCallback(
    (iNames) => {
      const asyncSearch = async () => {
        try {
          setState({ ...state, loading: true });
          abortCtrl.current = new AbortController();
          const dv = await data.dataViews.create({ title: iNames.join(','), allowNoIndex: true });
          const dataView = dv.toSpec();
          const { browserFields } = getDataViewStateFromIndexFields(iNames, dataView.fields);

          previousIndexesName.current = dv.getIndexPattern().split(',');

          setState({
            loading: false,
            dataView,
            browserFields,
            indexes: dv.getIndexPattern().split(','),
            indexExists: dv.getIndexPattern().split(',').length > 0,
            indexPatterns: getIndexFields(dv.getIndexPattern(), dv.fields),
          });
        } catch (exc) {
          setState({
            browserFields: DEFAULT_BROWSER_FIELDS,
            indexes: indexNames,
            indexExists: true,
            indexPatterns: DEFAULT_INDEX_PATTERNS,
            dataView: undefined,
            loading: false,
          });
          addError(exc?.message, { title: i18n.ERROR_INDEX_FIELDS_SEARCH });
        }
      };

      asyncSearch();
    },
    [addError, data.dataViews, indexNames, state]
  );

  useEffect(() => {
    if (!isEmpty(indexNames) && !isEqual(previousIndexesName.current, indexNames)) {
      indexFieldsSearch(indexNames);
    }
    return () => {
      abortCtrl.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexNames, previousIndexesName]);

  return [state.loading, state];
};
