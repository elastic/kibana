/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { buildPhraseFilter, type Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { HOST_FIELD } from '../../../../../common/constants';
import type { InfraCustomDashboardAssetType } from '../../../../../common/custom_dashboards';

const fieldByAssetType = {
  host: HOST_FIELD,
} as Record<InfraCustomDashboardAssetType, string>;

export function getFilterByAssetName(
  assetName: string,
  assetType: InfraCustomDashboardAssetType,
  dataView: DataView
): Filter[] {
  const assetNameField = dataView.getFieldByName(fieldByAssetType[assetType]);
  return assetNameField ? [buildPhraseFilter(assetNameField, assetName, dataView)] : [];
}
