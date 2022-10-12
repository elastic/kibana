/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNestedField } from '@kbn/data-views-plugin/common';
import type { DataViewsContract, DataView, DataViewSpec } from '@kbn/data-views-plugin/public';
import { keyBy } from 'lodash';
import { CoreStart } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { loadFieldExisting } from '@kbn/unified-field-list-plugin/public';
import { IndexPattern, IndexPatternField, IndexPatternMap, IndexPatternRef } from '../types';
import { documentField } from '../datasources/form_based/document_field';
import { DateRange } from '../../common';
import { DataViewsState } from '../state_management';

type ErrorHandler = (err: Error) => void;
type MinimalDataViewsContract = Pick<DataViewsContract, 'get' | 'getIdsWithTitle' | 'create'>;

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
  restrictionRemapper: (name: string) => string = onRestrictionMapping
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
        filterable: field.filterable,
        searchable: field.searchable,
        meta: dataView.metaFields.includes(field.name),
        esTypes: field.esTypes,
        scripted: field.scripted,
        isMapped: field.isMapped,
        customLabel: field.customLabel,
        runtimeField: field.runtimeField,
        runtime: Boolean(field.runtimeField),
        timeSeriesMetricType: field.timeSeriesMetric,
        timeSeriesRollup: field.isRolledUpField,
        partiallyApplicableFunctions: field.isRolledUpField
          ? {
              percentile: true,
              percentile_rank: true,
              median: true,
              last_value: true,
              unique_count: true,
              standard_deviation: true,
            }
          : undefined,
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
          // @ts-ignore
          'toJSON' in format ? format.toJSON() : format,
        ])
      ),
    fields: newFields,
    getFieldByName: getFieldByNameFactory(newFields),
    hasRestrictions: !!typeMeta?.aggs,
    spec: dataView.toSpec(false),
    isPersisted: dataView.isPersisted(),
  };
}

export async function loadIndexPatternRefs(
  dataViews: MinimalDataViewsContract,
  adHocDataViews?: Record<string, DataViewSpec>,
  contextDataViewSpec?: DataViewSpec
): Promise<IndexPatternRef[]> {
  const indexPatterns = await dataViews.getIdsWithTitle();
  const missedIndexPatterns = Object.values(adHocDataViews || {});

  // add data view from context
  if (contextDataViewSpec) {
    const existingDataView = indexPatterns.find(
      (indexPattern) => indexPattern.id === contextDataViewSpec.id
    );
    if (!existingDataView) {
      missedIndexPatterns.push(contextDataViewSpec);
    }
  }

  return indexPatterns
    .concat(
      missedIndexPatterns.map((dataViewSpec) => ({
        id: dataViewSpec.id!,
        name: dataViewSpec.name,
        title: dataViewSpec.title!,
      }))
    )
    .sort((a, b) => {
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
  adHocDataViews,
  onIndexPatternRefresh,
}: {
  dataViews: MinimalDataViewsContract;
  patterns: string[];
  notUsedPatterns?: string[];
  cache: Record<string, IndexPattern>;
  adHocDataViews?: Record<string, DataViewSpec>;
  onIndexPatternRefresh?: () => void;
}) {
  const missingIds = patterns.filter((id) => !cache[id] && !adHocDataViews?.[id]);
  const hasAdHocDataViews = Object.values(adHocDataViews || {}).length > 0;

  if (missingIds.length === 0 && !hasAdHocDataViews) {
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
  if (!indexPatterns.length && !hasAdHocDataViews && notUsedPatterns) {
    for (const notUsedPattern of notUsedPatterns) {
      const resp = await dataViews.get(notUsedPattern).catch((e) => {
        // do nothing
      });
      if (resp) {
        indexPatterns = [resp];
        break;
      }
    }
  }
  indexPatterns.push(
    ...(await Promise.all(
      Object.values(adHocDataViews || {}).map((spec) => dataViews.create(spec))
    ))
  );

  const indexPatternsObject = indexPatterns.reduce(
    (acc, indexPattern) => ({
      [indexPattern.id!]: convertDataViewIntoLensIndexPattern(indexPattern, onRestrictionMapping),
      ...acc,
    }),
    { ...cache }
  );

  return indexPatternsObject;
}

export async function ensureIndexPattern({
  id,
  onError,
  dataViews,
  cache = {},
}: {
  id: string;
  onError: ErrorHandler;
  dataViews: MinimalDataViewsContract;
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
  indexPatternList,
  dslQuery,
  core,
  data,
  dataViews,
}: {
  dateRange: DateRange;
  indexPatternList: IndexPattern[];
  dslQuery: object;
  core: Pick<CoreStart, 'http' | 'notifications' | 'uiSettings'>;
  data: DataPublicPluginStart;
  dataViews: DataViewsContract;
}) {
  try {
    const emptinessInfo = await Promise.all(
      indexPatternList.map(async (pattern) => {
        if (pattern.hasRestrictions) {
          return {
            indexPatternTitle: pattern.title,
            existingFieldNames: pattern.fields.map((field) => field.name),
          };
        }

        const dataView = await dataViews.get(pattern.id);
        return await loadFieldExisting({
          dslQuery,
          fromDate: dateRange.fromDate,
          toDate: dateRange.toDate,
          timeFieldName: pattern.timeFieldName,
          data,
          uiSettingsClient: core.uiSettings,
          dataViewsService: dataViews,
          dataView,
        });
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
  updateIndexPatterns: (
    newFieldState: FieldsPropsFromDataViewsState,
    options: { applyImmediately: boolean }
  ) => void;
  isFirstExistenceFetch: boolean;
  currentIndexPatternTitle: string;
  dslQuery: object;
  onNoData?: () => void;
  core: Pick<CoreStart, 'http' | 'notifications' | 'uiSettings'>;
  data: DataPublicPluginStart;
  dataViews: DataViewsContract;
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
      existingFields: newExistingFields,
      ...(result
        ? { isFirstExistenceFetch: status !== 200 }
        : {
            isFirstExistenceFetch,
            existenceFetchFailed: status !== 408,
            existenceFetchTimeout: status === 408,
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
