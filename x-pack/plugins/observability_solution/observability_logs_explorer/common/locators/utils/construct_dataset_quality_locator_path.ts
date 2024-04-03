/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetQualityLocatorParams } from '@kbn/deeplinks-observability/locators';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/common';
import { OBSERVABILITY_LOGS_EXPLORER_APP_ID } from '@kbn/deeplinks-observability';
import {
  OBSERVABILITY_DATASET_QUALITY_URL_STATE_KEY,
  datasetQualityUrlSchemaV1,
} from '../../url_schema';
import { deepCompactObject } from '../../utils/deep_compact_object';

interface LocatorPathConstructionParams {
  locatorParams: DatasetQualityLocatorParams;
  useHash: boolean;
}

export const constructDatasetQualityLocatorPath = async (params: LocatorPathConstructionParams) => {
  const {
    locatorParams: { filters },
    useHash,
  } = params;

  const pageState = datasetQualityUrlSchemaV1.urlSchemaRT.encode(
    deepCompactObject({
      v: 1,
      filters,
    })
  );

  const path = setStateToKbnUrl(
    OBSERVABILITY_DATASET_QUALITY_URL_STATE_KEY,
    pageState,
    { useHash, storeInHashQuery: false },
    '/dataset-quality'
  );

  return {
    app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
    path,
    state: {},
  };
};
