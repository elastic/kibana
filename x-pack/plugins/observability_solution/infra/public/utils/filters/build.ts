/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BooleanRelation,
  buildCombinedFilter,
  buildPhraseFilter,
  type Filter,
  isCombinedFilter,
} from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import type { InfraCustomDashboardAssetType } from '../../../common/custom_dashboards';

export const buildCombinedHostsFilter = ({
  field,
  values,
  dataView,
}: {
  values: string[];
  field: string;
  dataView?: DataView;
}) => {
  const indexField = dataView?.getFieldByName(field);
  if (!dataView || !indexField) {
    return {
      query: {
        terms: {
          [field]: values,
        },
      },
      meta: {},
    };
  }
  const filtersFromValues = values.map((value) => buildPhraseFilter(indexField, value, dataView));

  return buildCombinedFilter(BooleanRelation.OR, filtersFromValues, dataView);
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

export const buildAssetIdFilter = (
  assetId: string,
  assetType: InfraCustomDashboardAssetType,
  dataView: DataView
): Filter[] => {
  const assetIdField = dataView.getFieldByName(findInventoryFields(assetType).id);
  return assetIdField ? [buildPhraseFilter(assetIdField, assetId, dataView)] : [];
};
