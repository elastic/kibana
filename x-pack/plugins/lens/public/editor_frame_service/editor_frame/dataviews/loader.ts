/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNestedField } from '@kbn/data-views-plugin/common';
import type { DataViewsContract, DataView } from '@kbn/data-views-plugin/public';
import { keyBy } from 'lodash';
import { documentField } from '../../../indexpattern_datasource/document_field';
import type { IndexPattern, IndexPatternField } from '../../types';

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

export async function loadIndexPatterns({
  indexPatternsService,
  patterns,
  notUsedPatterns,
  cache,
  onIndexPatternRefresh,
  restrictionRemapper,
}: {
  indexPatternsService: DataViewsContract;
  patterns: string[];
  notUsedPatterns?: string[];
  cache: Record<string, IndexPattern>;
  onIndexPatternRefresh?: () => void;
  restrictionRemapper: (name: string) => string;
}) {
  const missingIds = patterns.filter((id) => !cache[id]);

  if (missingIds.length === 0) {
    return cache;
  }

  onIndexPatternRefresh?.();

  const allIndexPatterns = await Promise.allSettled(
    missingIds.map((id) => indexPatternsService.get(id))
  );
  // ignore rejected indexpatterns here, they're already handled at the app level
  let indexPatterns = allIndexPatterns
    .filter(
      (response): response is PromiseFulfilledResult<DataView> => response.status === 'fulfilled'
    )
    .map((response) => response.value);

  // if all of the used index patterns failed to load, try loading one of not used ones till one succeeds
  for (let i = 0; notUsedPatterns && i < notUsedPatterns?.length && !indexPatterns.length; i++) {
    const resp = await indexPatternsService.get(notUsedPatterns[i]).catch((e) => {
      // do nothing
    });
    if (resp) {
      indexPatterns = [resp];
    }
  }

  const indexPatternsObject = indexPatterns.reduce(
    (acc, indexPattern) => ({
      [indexPattern.id!]: convertDataViewIntoLensIndexPattern(indexPattern, restrictionRemapper),
      ...acc,
    }),
    { ...cache }
  );

  return indexPatternsObject;
}

// export async function changeIndexPattern({
//   id,
//   state,
//   setState,
//   onError,
//   indexPatternsService,
// }: {
//   id: string;
//   state: IndexPatternPrivateState;
//   setState: SetState;
//   onError: ErrorHandler;
//   indexPatternsService: DataViewsContract;
// }) {
//   const indexPatterns = await loadIndexPatterns({
//     indexPatternsService,
//     cache: state.indexPatterns,
//     patterns: [id],
//   });

//   if (indexPatterns[id] == null) {
//     return onError(Error('Missing indexpatterns'));
//   }

//   try {
//     setState((s) => ({
//       ...s,
//       indexPatterns: {
//         ...s.indexPatterns,
//         [id]: indexPatterns[id],
//       },
//     }));
//   } catch (err) {
//     onError(err);
//   }
// }
