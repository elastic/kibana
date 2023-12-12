/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { lastValueFrom } from 'rxjs';
import { getIndexPatternFromESQLQuery } from '@kbn/es-query';
import { getData, getIndexPatternService } from '../../../kibana_services';

export async function getEsqlMeta(esql: string) {
  return {
    columns: await getColumns(esql),
    dateFields: await getDateFields(esql),
    geoFields: await getGeoFields(esql),
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

    return resp.rawResponse.columns;
  } catch (error) {
    throw new Error(i18n.translate('xpack.maps.source.esql.getColumnsErrorMsg', {
      defaultMessage: 'Unable to load columns. {errorMessage}',
      values: { errorMessage: error.message }
    }))
  }
}

function getDateFields(esql: string) {
  return getFields(esql, 'date');
}

function getGeoFields(esql: string) {
  return getFields(esql, 'geo_point');
}

async function getFields(esql: string, type: string) {
  const pattern: string = getIndexPatternFromESQLQuery(esql);

  try {
    const fields = await getIndexPatternService().getFieldsForWildcard({ pattern, type });
    return fields.filter(field => {
      // getFieldsForWildcard is not filtering by field type so need to filter client-side
      return field.type === type;
    }).map(field => {
      return field.name;
    });
  } catch (error) {
    throw new Error(i18n.translate('xpack.maps.source.esql.getFieldsErrorMsg', {
      defaultMessage: 'Unable to load fields from pattern: {pattern}. {errorMessage}',
      values: {
        errorMessage: error.message,
        pattern,
      }
    }))
  }
}