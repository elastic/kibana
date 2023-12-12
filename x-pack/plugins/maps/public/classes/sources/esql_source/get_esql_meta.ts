/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { lastValueFrom } from 'rxjs';
import { getIndexPatternFromESQLQuery } from '@kbn/es-query';
import type { EsqlSourceDescriptor } from '../../../../common/descriptor_types';
import { getData, getIndexPatternService } from '../../../kibana_services';

export async function getEsqlMeta(esql: string) {
  const columns = await getColumns(esql);
  const { dateFields, geoFields } = await getFields(esql);
  return {
    columns,
    dateFields,
    geoFields,
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

    return (resp.rawResponse as unknown as { columns: EsqlSourceDescriptor['columns'] }).columns;
  } catch (error) {
    throw new Error(i18n.translate('xpack.maps.source.esql.getColumnsErrorMsg', {
      defaultMessage: 'Unable to load columns. {errorMessage}',
      values: { errorMessage: error.message }
    }))
  }
}

async function getFields(esql: string) {
  const pattern: string = getIndexPatternFromESQLQuery(esql);
  try {
    const dateFields: string[] = [];
    const geoFields: string[] = [];
    // TODO pass field type filter to getFieldsForWildcard when field type filtering is supported
    const fields = await getIndexPatternService().getFieldsForWildcard({ pattern });
    fields.forEach(field => {
      if (field.type === 'date') {
        dateFields.push(field.name);
      } else if (field.type === 'geo_point') {
        geoFields.push(field.name);
      }
    });
    return {
      dateFields,
      geoFields
    };
  } catch (error) {
    throw new Error(i18n.translate('xpack.maps.source.esql.getFieldsErrorMsg', {
      defaultMessage: `Unable to load fields from pattern: {pattern}. {errorMessage}`,
      values: {
        errorMessage: error.message,
        pattern,
      }
    }))
  }
}