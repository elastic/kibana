/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DatasetQualityFlyoutOptions,
  DatasetQualityPublicStateUpdate,
} from '@kbn/dataset-quality-plugin/public/controller';
import * as rt from 'io-ts';
import { deepCompactObject } from '../../../common/utils/deep_compact_object';
import { datasetQualityUrlSchemaV1 } from '../../../common/url_schema';

export const getStateFromUrlValue = (
  urlValue: datasetQualityUrlSchemaV1.UrlSchema
): DatasetQualityPublicStateUpdate =>
  deepCompactObject<DatasetQualityPublicStateUpdate>({
    table: urlValue.table,
    flyout: getFlyoutFromUrlValue(urlValue.flyout),
    filters: urlValue.filters,
  });

export const getUrlValueFromState = (
  state: DatasetQualityPublicStateUpdate
): datasetQualityUrlSchemaV1.UrlSchema =>
  deepCompactObject<datasetQualityUrlSchemaV1.UrlSchema>({
    table: state.table,
    flyout: state.flyout,
    filters: state.filters,
    v: 1,
  });

const stateFromUrlSchemaRT = new rt.Type<
  DatasetQualityPublicStateUpdate,
  datasetQualityUrlSchemaV1.UrlSchema,
  datasetQualityUrlSchemaV1.UrlSchema
>(
  'stateFromUrlSchemaRT',
  rt.never.is,
  (urlSchema, _context) => rt.success(getStateFromUrlValue(urlSchema)),
  getUrlValueFromState
);

export const stateFromUntrustedUrlRT =
  datasetQualityUrlSchemaV1.urlSchemaRT.pipe(stateFromUrlSchemaRT);

const getFlyoutFromUrlValue = (
  flyout?: datasetQualityUrlSchemaV1.UrlSchema['flyout']
): DatasetQualityFlyoutOptions =>
  deepCompactObject<DatasetQualityFlyoutOptions>({
    ...(flyout
      ? {
          ...flyout,
          dataset: flyout.dataset
            ? {
                ...flyout.dataset,
                integration: flyout.dataset.integration
                  ? {
                      ...flyout.dataset.integration,
                      datasets: {},
                    }
                  : undefined,
              }
            : undefined,
        }
      : {}),
  });
