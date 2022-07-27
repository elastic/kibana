/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNestedField } from '@kbn/data-views-plugin/common';
import type { DataViewsContract, DataView } from '@kbn/data-views-plugin/public';
import { keyBy } from 'lodash';
import { HttpSetup } from '@kbn/core/public';
import { IndexPattern, IndexPatternField, IndexPatternMap, IndexPatternRef } from '../types';
import { documentField } from '../indexpattern_datasource/document_field';
import { BASE_API_URL, DateRange, ExistingFields } from '../../common';
import { DataViewsState } from '../state_management';

type ErrorHandler = (err: Error) => void;

/**
 * All these functions will be used by the Embeddable instance too,
 * therefore keep all these functions pretty raw here and do not use the IndexPatternService
 */

export function getFieldByNameFactory(newFields: IndexPatternField[]) {
  const fieldsLookup = keyBy(newFields, 'name');
  return (name: string) => fieldsLookup[name];
}

export function convertDataViewIntoLensIndexPattern(
  dataView: DataView,
  restrictionRemapper: (name: string) => string
): IndexPattern {
  const newFields = dataView.fields
    .filter((field) => !isNestedField(field) && (!!field.aggregatable || !!field.scripted))
    .map((field): IndexPatternField => {
      // Convert the getters on the index pattern service into plain JSON
      const base = {
        name: field.name,
        displayName: field.displayName,
        type: field.type,
        aggregatable: field.aggregatable,
        searchable: field.searchable,
        meta: dataView.metaFields.includes(field.name),
        esTypes: field.esTypes,
        scripted: field.scripted,
        runtime: Boolean(field.runtimeField),
      };

      // Simplifies tests by hiding optional properties instead of undefined
      return base.scripted
        ? {
            ...base,
            lang: field.lang,
            script: field.script,
          }
        : base;
    })
    .concat(documentField);

  const { typeMeta, title, name, timeFieldName, fieldFormatMap } = dataView;
  if (typeMeta?.aggs) {
    const aggs = Object.keys(typeMeta.aggs);
    newFields.forEach((field, index) => {
      const restrictionsObj: IndexPatternField['aggregationRestrictions'] = {};
      aggs.forEach((agg) => {
        const restriction = typeMeta.aggs && typeMeta.aggs[agg] && typeMeta.aggs[agg][field.name];
        if (restriction) {
          restrictionsObj[restrictionRemapper(agg)] = restriction;
        }
      });
      if (Object.keys(restrictionsObj).length) {
        newFields[index] = { ...field, aggregationRestrictions: restrictionsObj };
      }
    });
  }

  return {
    id: dataView.id!, // id exists for sure because we got index patterns by id
    title,
    name: name ? name : title,
    timeFieldName,
    fieldFormatMap:
      fieldFormatMap &&
      Object.fromEntries(
        Object.entries(fieldFormatMap).map(([id, format]) => [
          id,
          'toJSON' in format ? format.toJSON() : format,
        ])
      ),
    fields: newFields,
    getFieldByName: getFieldByNameFactory(newFields),
    hasRestrictions: !!typeMeta?.aggs,
  };
}

export async function loadIndexPatternRefs(
  indexPatternsService: DataViewsContract
): Promise<IndexPatternRef[]> {
  const indexPatterns = await indexPatternsService.getIdsWithTitle();

  return indexPatterns.sort((a, b) => {
    return a.title.localeCompare(b.title);
  });
}

/**
 * Map ES agg names with Lens ones
 */
const renameOperationsMapping: Record<string, string> = {
  avg: 'average',
  cardinality: 'unique_count',
};

function onRestrictionMapping(agg: string): string {
  return agg in renameOperationsMapping ? renameOperationsMapping[agg] : agg;
}

export async function loadIndexPatterns({
  dataViews,
  patterns,
  notUsedPatterns,
  cache,
  onIndexPatternRefresh,
}: {
  dataViews: DataViewsContract;
  patterns: string[];
  notUsedPatterns?: string[];
  cache: Record<string, IndexPattern>;
  onIndexPatternRefresh?: () => void;
}) {
  const missingIds = patterns.filter((id) => !cache[id]);

  if (missingIds.length === 0) {
    return cache;
  }

  onIndexPatternRefresh?.();

  const allIndexPatterns = await Promise.allSettled(missingIds.map((id) => dataViews.get(id)));
  // ignore rejected indexpatterns here, they're already handled at the app level
  let indexPatterns = allIndexPatterns
    .filter(
      (response): response is PromiseFulfilledResult<DataView> => response.status === 'fulfilled'
    )
    .map((response) => response.value);

  // if all of the used index patterns failed to load, try loading one of not used ones till one succeeds
  if (!indexPatterns.length && notUsedPatterns) {
    for (const notUsedPattern of notUsedPatterns) {
      const resp = await dataViews.get(notUsedPattern).catch((e) => {
        // do nothing
      });
      if (resp) {
        indexPatterns = [resp];
      }
    }
  }

  const indexPatternsObject = indexPatterns.reduce(
    (acc, indexPattern) => ({
      [indexPattern.id!]: convertDataViewIntoLensIndexPattern(indexPattern, onRestrictionMapping),
      ...acc,
    }),
    { ...cache }
  );

  return indexPatternsObject;
}

export async function loadIndexPattern({
  id,
  onError,
  dataViews,
  cache = {},
}: {
  id: string;
  onError: ErrorHandler;
  dataViews: DataViewsContract;
  cache?: IndexPatternMap;
}) {
  const indexPatterns = await loadIndexPatterns({
    dataViews,
    cache,
    patterns: [id],
  });

  if (indexPatterns[id] == null) {
    onError(Error('Missing indexpatterns'));
    return;
  }

  const newIndexPatterns = {
    ...cache,
    [id]: indexPatterns[id],
  };
  return newIndexPatterns;
}

async function refreshExistingFields({
  dateRange,
  fetchJson,
  indexPatternList,
  dslQuery,
}: {
  dateRange: DateRange;
  indexPatternList: IndexPattern[];
  fetchJson: HttpSetup['post'];
  dslQuery: object;
}) {
  try {
    const emptinessInfo = await Promise.all(
      indexPatternList.map((pattern) => {
        if (pattern.hasRestrictions) {
          return {
            indexPatternTitle: pattern.title,
            existingFieldNames: pattern.fields.map((field) => field.name),
          };
        }
        const body: Record<string, string | object> = {
          dslQuery,
          fromDate: dateRange.fromDate,
          toDate: dateRange.toDate,
        };

        if (pattern.timeFieldName) {
          body.timeFieldName = pattern.timeFieldName;
        }

        return fetchJson(`${BASE_API_URL}/existing_fields/${pattern.id}`, {
          body: JSON.stringify(body),
        }) as Promise<ExistingFields>;
      })
    );
    return { result: emptinessInfo, status: 200 };
  } catch (e) {
    return { result: undefined, status: e.res?.status as number };
  }
}

type FieldsPropsFromDataViewsState = Pick<
  DataViewsState,
  'existingFields' | 'isFirstExistenceFetch' | 'existenceFetchTimeout' | 'existenceFetchFailed'
>;
export async function syncExistingFields({
  updateIndexPatterns,
  isFirstExistenceFetch,
  currentIndexPatternTitle,
  onNoData,
  existingFields,
  ...requestOptions
}: {
  dateRange: DateRange;
  indexPatternList: IndexPattern[];
  existingFields: Record<string, Record<string, boolean>>;
  fetchJson: HttpSetup['post'];
  updateIndexPatterns: (
    newFieldState: FieldsPropsFromDataViewsState,
    options: { applyImmediately: boolean }
  ) => void;
  isFirstExistenceFetch: boolean;
  currentIndexPatternTitle: string;
  dslQuery: object;
  onNoData?: () => void;
}) {
  const { indexPatternList } = requestOptions;
  const newExistingFields = { ...existingFields };

  const { result, status } = await refreshExistingFields(requestOptions);

  if (result) {
    if (isFirstExistenceFetch) {
      const fieldsCurrentIndexPattern = result.find(
        (info) => info.indexPatternTitle === currentIndexPatternTitle
      );
      if (fieldsCurrentIndexPattern && fieldsCurrentIndexPattern.existingFieldNames.length === 0) {
        onNoData?.();
      }
    }

    for (const { indexPatternTitle, existingFieldNames } of result) {
      newExistingFields[indexPatternTitle] = booleanMap(existingFieldNames);
    }
  } else {
    for (const { title, fields } of indexPatternList) {
      newExistingFields[title] = booleanMap(fields.map((field) => field.name));
    }
  }

  updateIndexPatterns(
    {
      isFirstExistenceFetch: status !== 200,
      existingFields: newExistingFields,
      ...(result
        ? {}
        : {
            existenceFetchFailed: status !== 418,
            existenceFetchTimeout: status === 418,
          }),
    },
    { applyImmediately: true }
  );
}

function booleanMap(keys: string[]) {
  return keys.reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {} as Record<string, boolean>);
}
