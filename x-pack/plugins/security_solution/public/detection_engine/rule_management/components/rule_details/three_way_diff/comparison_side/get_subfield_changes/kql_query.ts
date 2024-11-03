/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyToSortedJson } from '../utils';
import type { RuleKqlQuery } from '../../../../../../../../common/api/detection_engine';
import type { SubfieldChange } from '../types';

export const getSubfieldChangesForKqlQuery = (
  oldFieldValue?: RuleKqlQuery,
  newFieldValue?: RuleKqlQuery
): SubfieldChange[] => {
  const changes: SubfieldChange[] = [];

  const oldType = stringifyToSortedJson(oldFieldValue?.type);
  const newType = stringifyToSortedJson(newFieldValue?.type);

  if (oldType !== newType) {
    changes.push({
      subfieldName: 'type',
      oldSubfieldValue: oldType,
      newSubfieldValue: newType,
    });
  }

  const oldQuery = stringifyToSortedJson(
    oldFieldValue?.type === 'inline_query' ? oldFieldValue?.query : ''
  );
  const newQuery = stringifyToSortedJson(
    newFieldValue?.type === 'inline_query' ? newFieldValue?.query : ''
  );

  if (oldQuery !== newQuery) {
    changes.push({
      subfieldName: 'query',
      oldSubfieldValue: oldQuery,
      newSubfieldValue: newQuery,
    });
  }

  const oldLanguage = stringifyToSortedJson(
    oldFieldValue?.type === 'inline_query' ? oldFieldValue?.language : ''
  );
  const newLanguage = stringifyToSortedJson(
    newFieldValue?.type === 'inline_query' ? newFieldValue?.language : ''
  );

  if (oldLanguage !== newLanguage) {
    changes.push({
      subfieldName: 'language',
      oldSubfieldValue: oldLanguage,
      newSubfieldValue: newLanguage,
    });
  }

  const oldFilters = stringifyToSortedJson(
    oldFieldValue?.type === 'inline_query' ? oldFieldValue?.filters : ''
  );
  const newFilters = stringifyToSortedJson(
    newFieldValue?.type === 'inline_query' ? newFieldValue?.filters : ''
  );

  if (oldFilters !== newFilters) {
    changes.push({
      subfieldName: 'filters',
      oldSubfieldValue: oldFilters,
      newSubfieldValue: newFilters,
    });
  }

  const oldSavedQueryId = stringifyToSortedJson(
    oldFieldValue?.type === 'saved_query' ? oldFieldValue?.saved_query_id : ''
  );
  const newSavedQueryId = stringifyToSortedJson(
    newFieldValue?.type === 'saved_query' ? newFieldValue?.saved_query_id : ''
  );

  if (oldSavedQueryId !== newSavedQueryId) {
    changes.push({
      subfieldName: 'saved_query_id',
      oldSubfieldValue: oldSavedQueryId,
      newSubfieldValue: newSavedQueryId,
    });
  }

  return changes;
};
