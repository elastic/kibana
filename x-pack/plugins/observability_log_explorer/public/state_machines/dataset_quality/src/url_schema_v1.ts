/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetQualityPublicStateUpdate } from '@kbn/dataset-quality-plugin/public/controller';
import * as rt from 'io-ts';
import { datasetQualityUrlSchema, deepCompactObject } from '../../../../common';

export const getStateFromUrlValue = (
  urlValue: datasetQualityUrlSchema.UrlSchema
): DatasetQualityPublicStateUpdate =>
  deepCompactObject<DatasetQualityPublicStateUpdate>({
    table: urlValue.table,
  });

export const getUrlValueFromState = (
  state: DatasetQualityPublicStateUpdate
): datasetQualityUrlSchema.UrlSchema =>
  deepCompactObject<datasetQualityUrlSchema.UrlSchema>({
    table: state.table,
    v: 1,
  });

const stateFromUrlSchemaRT = new rt.Type<
  DatasetQualityPublicStateUpdate,
  datasetQualityUrlSchema.UrlSchema,
  datasetQualityUrlSchema.UrlSchema
>(
  'stateFromUrlSchemaRT',
  rt.never.is,
  (urlSchema, context) => rt.success(getStateFromUrlValue(urlSchema)),
  getUrlValueFromState
);

export const stateFromUntrustedUrlRT =
  datasetQualityUrlSchema.urlSchemaRT.pipe(stateFromUrlSchemaRT);
