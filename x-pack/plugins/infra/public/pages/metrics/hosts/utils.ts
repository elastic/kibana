/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter, isCombinedFilter } from '@kbn/es-query';

import { BooleanRelation, buildCombinedFilter, buildPhraseFilter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';

const HOST_NAME_FIELD = 'host.name';

export const buildCombinedHostsFilter = ({
  field,
  values,
  dataView,
}: {
  values: string[];
  field: string;
  dataView: DataView;
}) => {
  const indexField = dataView.getFieldByName(field)!;
  const filtersFromValues = values.map((value) => buildPhraseFilter(indexField, value, dataView));

  return buildCombinedFilter(BooleanRelation.OR, filtersFromValues, dataView);
};

export const createHostsFilter = (hostNames: string[], dataView?: DataView): Filter => {
  return dataView
    ? buildCombinedHostsFilter({ field: HOST_NAME_FIELD, values: hostNames, dataView })
    : {
        query: {
          terms: {
            HOST_NAME_FIELD: hostNames,
          },
        },
        meta: {},
      };
};

export const retrieveFieldsFromFilter = (filters: Filter[], fields: string[] = []) => {
  for (const filter of filters) {
    if (isCombinedFilter(filter)) {
      retrieveFieldsFromFilter(filter.meta.params, fields);
    }

    if (filter.meta.key) {
      fields.push(filter.meta.key);
    }
  }

  return fields;
};
