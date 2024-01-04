/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { lastValueFrom } from 'rxjs';
import { getIndexPatternFromESQLQuery } from '@kbn/es-query';
import type { ESQLColumn } from '@kbn/es-types';
import { getData, getIndexPatternService } from '../../../kibana_services';

export const ESQL_GEO_POINT_TYPE = 'geo_point';

const NO_GEOMETRY_COLUMN_ERROR_MSG = i18n.translate(
  'xpack.maps.source.esql.noGeometryColumnErrorMsg',
  {
    defaultMessage: 'Elasticsearch ES|QL query does not have a geometry column.',
  }
);

function isGeometryColumn(column: ESQLColumn) {
  return column.type === ESQL_GEO_POINT_TYPE;
}

export function verifyGeometryColumn(columns: ESQLColumn[]) {
  const geometryColumns = columns.filter(isGeometryColumn);
  if (geometryColumns.length === 0) {
    throw new Error(NO_GEOMETRY_COLUMN_ERROR_MSG);
  }

  if (geometryColumns.length > 1) {
    throw new Error(
      i18n.translate('xpack.maps.source.esql.multipleGeometryColumnErrorMsg', {
        defaultMessage: `Elasticsearch ES|QL query has {count} geometry columns when only 1 is allowed. Use 'DROP' or 'KEEP' to narrow columns.`,
        values: {
          count: geometryColumns.length,
        },
      })
    );
  }
}

export function getGeometryColumnIndex(columns: ESQLColumn[]) {
  const index = columns.findIndex(isGeometryColumn);
  if (index === -1) {
    throw new Error(NO_GEOMETRY_COLUMN_ERROR_MSG);
  }
  return index;
}

export async function getESQLMeta(esql: string) {
  return {
    columns: await getColumns(esql),
    dateFields: await getDateFields(esql),
  };
}

/*
 * Map column.type to field type
 * Supported column types https://www.elastic.co/guide/en/elasticsearch/reference/master/esql-limitations.html#_supported_types
 */
export function getFieldType(column: ESQLColumn) {
  switch (column.type) {
    case 'boolean':
    case 'date':
    case 'ip':
    case 'keyword':
    case 'text':
      return 'string';
    case 'double':
    case 'int':
    case 'long':
    case 'unsigned_long':
      return 'number';
    default:
      return undefined;
  }
}

async function getColumns(esql: string) {
  const params = {
    query: esql + ' | limit 0',
  };

  try {
    const resp = await lastValueFrom(
      getData().search.search(
        { params },
        {
          strategy: 'esql',
        }
      )
    );

    return (resp.rawResponse as unknown as { columns: ESQLColumn[] }).columns;
  } catch (error) {
    throw new Error(
      i18n.translate('xpack.maps.source.esql.getColumnsErrorMsg', {
        defaultMessage: 'Unable to load columns. {errorMessage}',
        values: { errorMessage: error.message },
      })
    );
  }
}

export async function getDateFields(esql: string) {
  const pattern: string = getIndexPatternFromESQLQuery(esql);
  try {
    // TODO pass field type filter to getFieldsForWildcard when field type filtering is supported
    return (await getIndexPatternService().getFieldsForWildcard({ pattern }))
      .filter((field) => {
        return field.type === 'date';
      })
      .map((field) => {
        return field.name;
      });
  } catch (error) {
    throw new Error(
      i18n.translate('xpack.maps.source.esql.getFieldsErrorMsg', {
        defaultMessage: `Unable to load date fields from index pattern: {pattern}. {errorMessage}`,
        values: {
          errorMessage: error.message,
          pattern,
        },
      })
    );
  }
}
