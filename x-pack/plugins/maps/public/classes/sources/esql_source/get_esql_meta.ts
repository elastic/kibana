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

const NO_GEOMETRY_COLUMN_ERROR_MSG = i18n.translate('xpack.maps.source.esql.noGeometryColumnErrorMsg', {
  defaultMessage: 'Elasticsearch ES|QL query does not have a geometry column.',
});

function isGeometryColumn(column: ESQLColumn) {
  return column.type === 'geo_point';
}

export function verifyGeometryColumn(columns: ESQLColumn[]) {
  const geometryColumns = columns.filter(isGeometryColumn);
  if (geometryColumns.length === 0) {
    throw new Error(NO_GEOMETRY_COLUMN_ERROR_MSG);
  }

  if (geometryColumns.length > 1) {
    throw new Error(i18n.translate('xpack.maps.source.esql.multipleGeometryColumnErrorMsg', {
      defaultMessage: `Elasticsearch ES|QL query has {count} geometry columns when only 1 is allowed. Use 'KEEP' command to narrow columns.`,
      values: {
        count: geometryColumns.length
      }
    }));
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

async function getColumns(esql: string) {
  const params = {
    query: esql + ' | limit 0',
  };

  try {
    const resp = await lastValueFrom(
      getData().search.search({ params }, {
        strategy: 'esql',
      })
    );

    return (resp.rawResponse as unknown as { columns: ESQLColumn[] }).columns;
  } catch (error) {
    throw new Error(i18n.translate('xpack.maps.source.esql.getColumnsErrorMsg', {
      defaultMessage: 'Unable to load columns. {errorMessage}',
      values: { errorMessage: error.message }
    }))
  }
}

async function getDateFields(esql: string) {
  const pattern: string = getIndexPatternFromESQLQuery(esql);
  try {
    // TODO pass field type filter to getFieldsForWildcard when field type filtering is supported
    return (await getIndexPatternService().getFieldsForWildcard({ pattern }))
      .filter(field => {
        return field.type === 'date';
      })
      .map(field => {
        return field.name;
      });
  } catch (error) {
    throw new Error(i18n.translate('xpack.maps.source.esql.getFieldsErrorMsg', {
      defaultMessage: `Unable to load date fields from pattern: {pattern}. {errorMessage}`,
      values: {
        errorMessage: error.message,
        pattern,
      }
    }))
  }
}