/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import { termQuery, termsQuery } from '@kbn/observability-plugin/server';
import {
  EVENT_MODULE,
  METRICSET_MODULE,
  METRICSET_NAME,
  SYSTEM_INTEGRATION,
} from '../../../../../common/constants';
import { InfraAssetMetricType } from '../../../../../common/http_api/infra';

export const getFilterByIntegration = (integration: typeof SYSTEM_INTEGRATION) => {
  return {
    bool: {
      should: [
        ...termQuery(EVENT_MODULE, integration),
        ...termQuery(METRICSET_MODULE, integration),
      ],
      minimum_should_match: 1,
    },
  };
};

export const getValidDocumentsFilter = () => {
  return [
    // system module
    getFilterByIntegration('system'),
    // apm docs
    ...termsQuery(METRICSET_NAME, 'transaction'),
  ];
};

export const getInventoryModelAggregations = (
  assetType: 'host',
  metrics: InfraAssetMetricType[]
) => {
  const inventoryModel = findInventoryModel(assetType);
  return metrics.reduce<
    Partial<
      Record<
        InfraAssetMetricType,
        (typeof inventoryModel.metrics.snapshot)[keyof typeof inventoryModel.metrics.snapshot]
      >
    >
  >(
    (acc, metric) =>
      inventoryModel.metrics.snapshot?.[metric]
        ? Object.assign(acc, inventoryModel.metrics.snapshot[metric])
        : acc,
    {}
  );
};
