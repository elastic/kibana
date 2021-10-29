/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

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
  dashboard: i18n.translate('xpack.fleet.epm.assetTitles.dashboards', {
    defaultMessage: 'Dashboards',
  }),
  ilm_policy: i18n.translate('xpack.fleet.epm.assetTitles.ilmPolicies', {
    defaultMessage: 'ILM policies',
  }),
  ingest_pipeline: i18n.translate('xpack.fleet.epm.assetTitles.ingestPipelines', {
    defaultMessage: 'Ingest pipelines',
  }),
  transform: i18n.translate('xpack.fleet.epm.assetTitles.transforms', {
    defaultMessage: 'Transforms',
  }),
  index_pattern: i18n.translate('xpack.fleet.epm.assetTitles.indexPatterns', {
    defaultMessage: 'Index patterns',
  }),
  index_template: i18n.translate('xpack.fleet.epm.assetTitles.indexTemplates', {
    defaultMessage: 'Index templates',
  }),
  component_template: i18n.translate('xpack.fleet.epm.assetTitles.componentTemplates', {
    defaultMessage: 'Component templates',
  }),
  search: i18n.translate('xpack.fleet.epm.assetTitles.savedSearches', {
    defaultMessage: 'Saved searches',
  }),
  visualization: i18n.translate('xpack.fleet.epm.assetTitles.visualizations', {
    defaultMessage: 'Visualizations',
  }),
  map: i18n.translate('xpack.fleet.epm.assetTitles.maps', {
    defaultMessage: 'Maps',
  }),
  data_stream_ilm_policy: i18n.translate('xpack.fleet.epm.assetTitles.dataStreamILM', {
    defaultMessage: 'Data stream ILM policies',
  }),
  lens: i18n.translate('xpack.fleet.epm.assetTitles.lens', {
    defaultMessage: 'Lens',
  }),
  security_rule: i18n.translate('xpack.fleet.epm.assetTitles.securityRules', {
    defaultMessage: 'Security rules',
  }),
  ml_module: i18n.translate('xpack.fleet.epm.assetTitles.mlModules', {
    defaultMessage: 'ML modules',
  }),
  ml_model: i18n.translate('xpack.fleet.epm.assetTitles.mlModels', {
    defaultMessage: 'ML models',
  }),
  view: i18n.translate('xpack.fleet.epm.assetTitles.views', {
    defaultMessage: 'Views',
  }),
  tag: i18n.translate('xpack.fleet.epm.assetTitles.tag', {
    defaultMessage: 'Tag',
  }),
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
  tag: 'tagApp',
};

export const ServiceIcons: Record<ServiceName, IconType> = {
  elasticsearch: 'logoElasticsearch',
  kibana: 'logoKibana',
};
