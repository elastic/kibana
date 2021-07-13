/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';

import type { ServiceName } from '../../types';
import { ElasticsearchAssetType, KibanaAssetType } from '../../types';

// only allow Kibana assets for the kibana key, ES asssets for elasticsearch, etc
type ServiceNameToAssetTypes = Record<Extract<ServiceName, 'kibana'>, KibanaAssetType[]> &
  Record<Extract<ServiceName, 'elasticsearch'>, ElasticsearchAssetType[]>;

export const DisplayedAssets: ServiceNameToAssetTypes = {
  kibana: Object.values(KibanaAssetType),
  elasticsearch: Object.values(ElasticsearchAssetType),
};

export type DisplayedAssetType = ElasticsearchAssetType | KibanaAssetType | 'view';

export const AssetTitleMap: Record<DisplayedAssetType, string> = {
  dashboard: 'Dashboards',
  ilm_policy: 'ILM policies',
  ingest_pipeline: 'Ingest pipelines',
  transform: 'Transforms',
  index_pattern: 'Index patterns',
  index_template: 'Index templates',
  component_template: 'Component templates',
  search: 'Saved searches',
  visualization: 'Visualizations',
  map: 'Maps',
  data_stream_ilm_policy: 'Data stream ILM policies',
  lens: 'Lens',
  security_rule: 'Security rules',
  ml_module: 'ML modules',
  view: 'Views',
};

export const ServiceTitleMap: Record<ServiceName, string> = {
  kibana: 'Kibana',
  elasticsearch: 'Elasticsearch',
};

export const AssetIcons: Record<KibanaAssetType, IconType> = {
  dashboard: 'dashboardApp',
  index_pattern: 'indexPatternApp',
  search: 'searchProfilerApp',
  visualization: 'visualizeApp',
  map: 'emsApp',
  lens: 'lensApp',
  security_rule: 'securityApp',
  ml_module: 'mlApp',
};

export const ServiceIcons: Record<ServiceName, IconType> = {
  elasticsearch: 'logoElasticsearch',
  kibana: 'logoKibana',
};
