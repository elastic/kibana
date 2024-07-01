/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Language } from '@kbn/securitysolution-io-ts-alerting-types';
import type { Filter, EsQueryConfig, DataViewFieldBase } from '@kbn/es-query';
import { DataView } from '@kbn/data-views-plugin/server';
import { queryToFields } from '@kbn/data-plugin/common';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import { buildEsQuery } from '@kbn/es-query';
import type { ESBoolQuery } from '../../../../../common/typed_json';
import { getAllFilters } from './get_query_filter';
import type {
  IndexPatternArray,
  RuleQuery,
} from '../../../../../common/api/detection_engine/model/rule_schema';

export const getQueryFilterLoadFields =
  (dataViewsService: DataViewsContract) =>
  async ({
    query,
    language,
    filters,
    index,
    exceptionFilter,
  }: {
    query: RuleQuery;
    language: Language;
    filters: unknown;
    index: IndexPatternArray;
    exceptionFilter: Filter | undefined;
    fields?: DataViewFieldBase[];
  }): Promise<ESBoolQuery> => {
    const config: EsQueryConfig = {
      allowLeadingWildcards: true,
      queryStringOptions: { analyze_wildcard: true },
      ignoreFilterIfFieldNotInIndex: false,
      dateFormatTZ: 'Zulu',
    };

    const initialQuery = { query, language };
    const allFilters = getAllFilters(filters as Filter[], exceptionFilter);

    const title = (index ?? []).join();

    const dataViewLazy = await dataViewsService.createDataViewLazy({ title });

    const flds = await queryToFields({
      dataView: dataViewLazy,
      request: { query: [initialQuery], filters: allFilters },
    });

    const dataViewLimitedFields = new DataView({
      spec: { title },
      fieldFormats: {} as unknown as FieldFormatsStartCommon,
      shortDotsEnable: false,
      metaFields: [],
    });

    dataViewLimitedFields.fields.replaceAll(Object.values(flds).map((fld) => fld.toSpec()));

    return buildEsQuery(dataViewLimitedFields, initialQuery, allFilters, config);
  };
