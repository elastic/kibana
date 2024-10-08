/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import { EntityGrouping, Pivot, EntityFilter } from '../../../common/entities';
import { escapeColumn, escapeString } from '../../../common/utils/esql_escape';

const ENTITY_MISSING_VALUE_STRING = '__EMPTY__';
const ENTITY_ID_SEPARATOR = '@';
const ENTITY_DISPLAY_NAME_SEPARATOR = '/';

function joinArray<T>(source: T[], separator: T): T[] {
  return source.flatMap((value, index, array) => {
    if (index === array.length - 1) {
      return [value];
    }
    return [value, separator];
  });
}

function getExpressionForPivot(pivot: Pivot) {
  const sortedFields = pivot.identityFields.concat().sort();

  const restArguments = joinArray(
    sortedFields.map((field) => {
      return escapeColumn(field);
    }),
    `"${ENTITY_DISPLAY_NAME_SEPARATOR}"`
  ).join(', ');

  // CONCAT()
  // host@foo
  // data_stream@logs;kubernetes-container-logs;elastic-apps

  return `CONCAT("${pivot.type}", "${ENTITY_ID_SEPARATOR}", ${restArguments})`;
}

function getExpressionForFilter(filter: EntityFilter) {
  if ('term' in filter) {
    const fieldName = Object.keys(filter.term)[0];
    return `${escapeColumn(fieldName)} == ${escapeString(filter.term[fieldName])}`;
  }
  if ('index' in filter) {
    return filter.index.map((index) => `_index LIKE ${escapeString(`*${index}*`)}`).join(' OR ');
  }
}

function getExpressionForGrouping(grouping: EntityGrouping) {
  const applicableFilters = grouping.filters.filter((filter) => {
    return 'term' in filter;
  });

  if (applicableFilters.length) {
    return `CASE(
      ${compact(applicableFilters.map(getExpressionForFilter)).join(' AND ')},
      MV_APPEND(
        CONCAT(${escapeString(grouping.pivot.type)}, "${ENTITY_ID_SEPARATOR}", ${escapeString(
      grouping.id
    )}),
        ${getExpressionForPivot(grouping.pivot)}
      ),
      NULL
    )`;
  }

  return getExpressionForPivot(grouping.pivot);
}

export function getEsqlIdentityCommands(
  groupings: EntityGrouping[],
  entityIdExists: boolean
): { beforeStatsBy: string[]; afterStatsBy: string[] } {
  const groupExpressions = [
    ...(entityIdExists ? [`entity.id`] : []),
    ...groupings.map(getExpressionForGrouping),
  ];

  const entityIdExpression =
    groupExpressions.length === 1
      ? groupExpressions[0]
      : `MV_APPEND(
    ${groupExpressions
      .map((expression) => `COALESCE(${expression}, "${ENTITY_MISSING_VALUE_STRING}")`)
      .join(', ')}
  )`;

  return {
    beforeStatsBy: [`EVAL entity.id = ${entityIdExpression}`],
    afterStatsBy: [
      `MV_EXPAND entity.id`,
      `WHERE entity.id != "${ENTITY_MISSING_VALUE_STRING}"`,
      `EVAL entity_identifier = SPLIT(entity.id, "${ENTITY_ID_SEPARATOR}")`,
      `EVAL entity.type = MV_FIRST(entity_identifier)`,
      `EVAL entity.displayName = MV_LAST(entity_identifier)`,
      `DROP entity_identifier`,
    ],
  };
}
