/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entries } from 'lodash';
import { FieldSpec } from '@kbn/data-views-plugin/common';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { FieldOption } from '@kbn/triggers-actions-ui-plugin/public/common';
import { Datatable, DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import { EsQueryRuleParams, SearchType } from './types';

export const isSearchSourceRule = (
  ruleParams: EsQueryRuleParams
): ruleParams is EsQueryRuleParams<SearchType.searchSource> => {
  return ruleParams.searchType === 'searchSource';
};

export const isEsqlQueryRule = (
  ruleParams: EsQueryRuleParams
): ruleParams is EsQueryRuleParams<SearchType.esqlQuery> => {
  return ruleParams.searchType === 'esqlQuery';
};

export const convertFieldSpecToFieldOption = (fieldSpec: FieldSpec[]): FieldOption[] => {
  return (fieldSpec ?? [])
    .filter((spec: FieldSpec) => spec.isMapped)
    .map((spec: FieldSpec) => {
      const converted = {
        name: spec.name,
        searchable: spec.searchable,
        aggregatable: spec.aggregatable,
        type: spec.type,
        normalizedType: spec.type,
      };

      if (spec.type === 'string') {
        const esType = spec.esTypes && spec.esTypes.length > 0 ? spec.esTypes[0] : spec.type;
        converted.type = esType;
        converted.normalizedType = esType;
      } else if (spec.type === 'number') {
        const esType = spec.esTypes && spec.esTypes.length > 0 ? spec.esTypes[0] : spec.type;
        converted.type = esType;
      }

      return converted;
    });
};

export const useTriggerUiActionServices = () => useKibana().services;

export type EsqlDocument = Record<string, string | null>;

export interface EsqlHit {
  _id: string;
  _index: string;
  _source: EsqlDocument;
}

const rowToDocument = (columns: DatatableColumn[], row: DatatableRow): EsqlDocument => {
  return columns.reduce<Record<string, string | null>>((acc, column, i) => {
    acc[column.name] = row[column.name];

    return acc;
  }, {});
};

export const toEsResult = (results: Datatable, alertId?: string) => {
  const documentsGrouping = results.rows.reduce<Record<string, EsqlHit[]>>((acc, row) => {
    const document = rowToDocument(results.columns, row);
    const id = alertId ? document[alertId] ?? 'undefined' : 'test';
    const hit = {
      _id: id,
      _index: '',
      _source: document,
    };
    if (acc[id]) {
      acc[id].push(hit);
    } else {
      acc[id] = [hit];
    }

    return acc;
  }, {});

  return {
    groupAgg: {
      buckets: entries(documentsGrouping).map(([key, value]) => {
        return {
          key,
          doc_count: value.length,
          topHitsAgg: {
            hits: {
              hits: value,
            },
          },
        };
      }),
    },
  };
};
