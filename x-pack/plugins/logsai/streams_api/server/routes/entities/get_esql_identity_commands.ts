/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, uniq, uniqBy } from 'lodash';
import {
  EntityGrouping,
  Pivot,
  EntityFilter,
  PivotEntity,
  EntityTypeDefinition,
  DefinitionEntity,
  Entity,
  IEntity,
  EntityDisplayNameTemplate,
} from '../../../common/entities';
import { escapeColumn, escapeString } from '../../../common/utils/esql_escape';

const ENTITY_MISSING_VALUE_STRING = '__EMPTY__';
export const ENTITY_ID_SEPARATOR = '@';
const ENTITY_KEYS_SEPARATOR = '/';
const ENTITY_ID_LIST_SEPARATOR = ';';

export function entityFromIdentifiers({
  entity,
  typeDefinition,
  definitionEntities,
}: {
  entity: IEntity;
  typeDefinition: EntityTypeDefinition | undefined;
  definitionEntities: Map<string, DefinitionEntity>;
}): Entity | undefined {
  if (definitionEntities.has(entity.key)) {
    return definitionEntities.get(entity.key)!;
  }

  if (!typeDefinition) {
    return undefined;
  }

  const next = pivotEntityFromTypeAndKey({
    type: entity.type,
    key: entity.key,
    identityFields: typeDefinition.pivot.identityFields,
    displayNameTemplate: typeDefinition.displayNameTemplate,
  });

  return next;
}

export function pivotEntityFromTypeAndKey({
  type,
  key,
  identityFields,
  displayNameTemplate,
}: {
  type: string;
  key: string;
  identityFields: string[];
  displayNameTemplate: EntityDisplayNameTemplate | undefined;
}): PivotEntity {
  const sortedIdentityFields = identityFields.concat().sort();

  const keys = key.split(ENTITY_KEYS_SEPARATOR);

  const identity = Object.fromEntries(
    keys.map((value, index) => {
      return [sortedIdentityFields[index], value];
    })
  );

  const id = `${type}${ENTITY_ID_SEPARATOR}${key}}`;

  let displayName = key;

  if (displayNameTemplate) {
    displayName = displayNameTemplate.concat
      .map((part) => {
        return 'literal' in part ? part.literal : part.field;
      })
      .join('');
  }

  return {
    id,
    type,
    key,
    identity,
    displayName,
  };
}

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
    `"${ENTITY_KEYS_SEPARATOR}"`
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
    return `${filter.index
      .flatMap((index) => [index, `.ds-${index}-*`])
      .map((index) => `(_index LIKE ${escapeString(`${index}`)})`)
      .join(' OR ')}`;
  }
}

function getMatchesExpressionForGrouping(grouping: EntityGrouping) {
  const applicableFilters = grouping.filters.filter((filter) => {
    return 'term' in filter || 'index' in filter;
  });

  if (applicableFilters.length) {
    return `${compact(
      applicableFilters.map((filter) => `(${getExpressionForFilter(filter)})`)
    ).join(' AND ')}`;
  }

  return `true`;
}

export function getEsqlIdentityCommands({
  groupings,
  entityIdExists,
  columns,
  preaggregate,
}: {
  groupings: EntityGrouping[];
  entityIdExists: boolean;
  columns: string[];
  preaggregate: boolean;
}): string[] {
  const pivotIdExpressions = uniqBy(
    groupings.map((grouping) => grouping.pivot),
    (pivot) => pivot.type
  ).map(getExpressionForPivot);

  const filterClauses = groupings.map((grouping) => {
    return {
      fieldName: `_matches_group_${grouping.id}`,
      type: grouping.pivot.type,
      key: grouping.id,
      expression: getMatchesExpressionForGrouping(grouping),
    };
  });

  const filterColumnEvals = filterClauses.map(({ fieldName, expression }) => {
    return `${escapeColumn(fieldName)} = ${expression}`;
  });

  const filterStatsByColumns = filterClauses.map(({ fieldName }) => {
    return `${escapeColumn(fieldName)} = MAX(${escapeColumn(fieldName)})`;
  });

  const filterIdExpressions = filterClauses.map(({ fieldName, type, key }) => {
    return `CASE(
      ${escapeColumn(fieldName)},
      CONCAT(${escapeString(type)}, "${ENTITY_ID_SEPARATOR}", "${key}"),
      NULL
    )`;
  });

  const groupingFields = uniq(groupings.flatMap((grouping) => grouping.pivot.identityFields));

  const groupExpressions = joinArray(
    [
      ...(entityIdExists ? [`entity.id`] : []),
      ...pivotIdExpressions.concat(filterIdExpressions).map((expression) => {
        return `COALESCE(${expression}, "${ENTITY_MISSING_VALUE_STRING}")`;
      }),
    ],
    `"${ENTITY_ID_LIST_SEPARATOR}"`
  ).join(', ');

  const entityIdExpression =
    groupExpressions.length === 1
      ? groupExpressions[0]
      : `MV_DEDUPE(
      SPLIT(
        CONCAT(${groupExpressions}),
        "${ENTITY_ID_LIST_SEPARATOR}"
      )
    )`;

  const commands: string[] = [`EVAL ${filterColumnEvals.join(', ')}`];

  const allColumns = filterStatsByColumns.concat(columns);

  if (preaggregate) {
    commands.push(`STATS ${allColumns.join(', ')} BY ${groupingFields.join(', ')}`);
  }

  const entityDisplayNameExists = columns.find((column) => column.includes('entity.displayName'));

  return [
    ...commands,
    `EVAL entity.id = ${entityIdExpression}`,
    `STATS ${columns.join(', ')} BY entity.id`,
    `MV_EXPAND entity.id`,
    `WHERE entity.id != "${ENTITY_MISSING_VALUE_STRING}"`,
    `EVAL entity_identifier = SPLIT(entity.id, "${ENTITY_ID_SEPARATOR}")`,
    `EVAL entity.type = MV_FIRST(entity_identifier)`,
    `EVAL entity.key = MV_LAST(entity_identifier)`,
    entityDisplayNameExists
      ? `EVAL entity.displayName = COALESCE(entity.displayName, entity.key)`
      : `EVAL entity.displayName = entity.key`,
    `DROP entity_identifier`,
  ];
}
