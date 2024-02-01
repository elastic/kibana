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
import { ES_GEO_FIELD_TYPE } from '../../../../common/constants';
import { getData, getIndexPatternService } from '../../../kibana_services';

// ESQL_GEO_POINT_TYPE !== ES_GEO_FIELD_TYPE.GEO_POINT
// ES_GEO_FIELD_TYPE.GEO_POINT is a field type from an Elasticsearch index mapping
// ESQL_GEO_POINT_TYPE is a column type from an ESQL response
export const ESQL_GEO_POINT_TYPE = 'geo_point';

// ESQL_GEO_SHAPE_TYPE !== ES_GEO_FIELD_TYPE.GEO_SHAPE
// ES_GEO_FIELD_TYPE.GEO_SHAPE is a field type from an Elasticsearch index mapping
// ESQL_GEO_SHAPE_TYPE is a column type from an ESQL response
export const ESQL_GEO_SHAPE_TYPE = 'geo_shape';

const NO_GEOMETRY_COLUMN_ERROR_MSG = i18n.translate(
  'xpack.maps.source.esql.noGeometryColumnErrorMsg',
  {
    defaultMessage: 'Elasticsearch ES|QL query does not have a geometry column.',
  }
);

export function isGeometryColumn(column: ESQLColumn) {
  return [ESQL_GEO_POINT_TYPE, ESQL_GEO_SHAPE_TYPE].includes(column.type);
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
  const fields = await getFields(esql);
  return {
    columns: await getColumns(esql),
    ...fields,
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

export async function getFields(esql: string) {
  const dateFields: string[] = [];
  const geoFields: string[] = [];
  const pattern: string = getIndexPatternFromESQLQuery(esql);
  try {
    // TODO pass field type filter to getFieldsForWildcard when field type filtering is supported
    (await getIndexPatternService().getFieldsForWildcard({ pattern })).forEach((field) => {
      if (field.type === 'date') {
        dateFields.push(field.name);
      } else if (
        field.type === ES_GEO_FIELD_TYPE.GEO_POINT ||
        field.type === ES_GEO_FIELD_TYPE.GEO_SHAPE
      ) {
        geoFields.push(field.name);
      }
    });
  } catch (error) {
    throw new Error(
      i18n.translate('xpack.maps.source.esql.getFieldsErrorMsg', {
        defaultMessage: `Unable to load fields from index pattern: {pattern}. {errorMessage}`,
        values: {
          errorMessage: error.message,
          pattern,
        },
      })
    );
  }

  return {
    dateFields,
    geoFields,
  };
}
