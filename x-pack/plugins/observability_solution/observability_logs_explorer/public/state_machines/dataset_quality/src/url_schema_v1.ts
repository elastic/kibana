/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetQualityPublicStateUpdate } from '@kbn/dataset-quality-plugin/public/controller';
import * as rt from 'io-ts';
import { datasetQualityUrlSchemaV1, deepCompactObject } from '../../../../common';

export const getStateFromUrlValue = (
  urlValue: datasetQualityUrlSchemaV1.UrlSchema
): DatasetQualityPublicStateUpdate =>
  deepCompactObject<DatasetQualityPublicStateUpdate>({
    table: urlValue.table,
    flyout: urlValue.flyout,
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
