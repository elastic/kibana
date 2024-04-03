/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { lastValueFrom } from 'rxjs';
import type { DataView } from '@kbn/data-plugin/common';
import { getESQLAdHocDataview, getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import type { ESQLColumn, ESQLSearchReponse } from '@kbn/es-types';
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

export function isGeometryColumn(column: ESQLColumn) {
  return [ESQL_GEO_POINT_TYPE, ESQL_GEO_SHAPE_TYPE].includes(column.type);
}

export function verifyGeometryColumn(columns: ESQLColumn[]) {
  const geometryColumns = columns.filter(isGeometryColumn);
  if (geometryColumns.length === 0) {
    throw new Error(
      i18n.translate('xpack.maps.source.esql.noGeometryColumnErrorMsg', {
        defaultMessage: 'Elasticsearch ES|QL query does not have a geometry column.',
      })
    );
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

export async function getESQLMeta(esql: string) {
  const adhocDataView = await getESQLAdHocDataview(
    getIndexPatternFromESQLQuery(esql),
    getIndexPatternService()
  );
  return {
    columns: await getColumns(esql),
    adhocDataViewId: adhocDataView.id!,
    ...getFields(adhocDataView),
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

    const searchResponse = resp.rawResponse as unknown as ESQLSearchReponse;
    return searchResponse.all_columns ? searchResponse.all_columns : searchResponse.columns;
  } catch (error) {
    throw new Error(
      i18n.translate('xpack.maps.source.esql.getColumnsErrorMsg', {
        defaultMessage: 'Unable to load columns. {errorMessage}',
        values: { errorMessage: error.message },
      })
    );
  }
}

export function getFields(dataView: DataView) {
  const dateFields: string[] = [];
  const geoFields: string[] = [];
  dataView.fields.forEach((field) => {
    if (field.type === 'date') {
      dateFields.push(field.name);
    } else if (
      field.type === ES_GEO_FIELD_TYPE.GEO_POINT ||
      field.type === ES_GEO_FIELD_TYPE.GEO_SHAPE
    ) {
      geoFields.push(field.name);
    }
  });

  return {
    dateFields,
    geoFields,
  };
}
