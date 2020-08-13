/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { Adapters } from 'src/plugins/inspector/public';
import { esFilters, search, ISearchSource } from '../../../../src/plugins/data/public';
import { MapsLegacyConfigType } from '../../../../src/plugins/maps_legacy/public';
import { MapsConfigType } from '../config';
import { MapsPluginStartDependencies } from './plugin';
import { CoreStart } from '../../../../src/core/public';

export const SPATIAL_FILTER_TYPE = esFilters.FILTERS.SPATIAL_FILTER;
const { getRequestInspectorStats, getResponseInspectorStats } = search;

let licenseId: string | undefined;
export const setLicenseId = (latestLicenseId: string | undefined) => (licenseId = latestLicenseId);
export const getLicenseId = () => licenseId;
let isGoldPlus: boolean = false;
export const setIsGoldPlus = (igp: boolean) => (isGoldPlus = igp);
export const getIsGoldPlus = () => isGoldPlus;

let kibanaVersion: string;
export const setKibanaVersion = (version: string) => (kibanaVersion = version);
export const getKibanaVersion = () => kibanaVersion;

let coreStart: CoreStart;
let pluginsStart: MapsPluginStartDependencies;
export function setStartServices(core: CoreStart, plugins: MapsPluginStartDependencies) {
  coreStart = core;
  pluginsStart = plugins;
}
export const getIndexPatternService = () => pluginsStart.data.indexPatterns;
export const getAutocompleteService = () => pluginsStart.data.autocomplete;
export const getInspector = () => pluginsStart.inspector;
export const getFileUploadComponent = () => pluginsStart.fileUpload.JsonUploadAndParse;
export const getUiSettings = () => coreStart.uiSettings;
export const getIsDarkMode = () => getUiSettings().get('theme:darkMode', false);
export const getIndexPatternSelectComponent = (): any => pluginsStart.data.ui.IndexPatternSelect;
export const getHttp = () => coreStart.http;
export const getTimeFilter = () => pluginsStart.data.query.timefilter.timefilter;
export const getToasts = () => coreStart.notifications.toasts;
export const getSavedObjectsClient = () => coreStart.savedObjects.client;
export const getCoreChrome = () => coreStart.chrome;
export const getMapsCapabilities = () => coreStart.application.capabilities.maps;
export const getDocLinks = () => coreStart.docLinks;
export const getCoreOverlays = () => coreStart.overlays;
export const getData = () => pluginsStart.data;
export const getUiActions = () => pluginsStart.uiActions;
export const getCore = () => coreStart;
export const getNavigation = () => pluginsStart.navigation;
export const getCoreI18n = () => coreStart.i18n;
export const getSearchService = () => pluginsStart.data.search;
export const getEmbeddableService = () => pluginsStart.embeddable;
export const getNavigateToApp = () => coreStart.application.navigateToApp;

// xpack.maps.* kibana.yml settings from this plugin
let mapAppConfig: MapsConfigType;
export const setMapAppConfig = (config: MapsConfigType) => (mapAppConfig = config);
export const getMapAppConfig = () => mapAppConfig;

export const getEnabled = () => getMapAppConfig().enabled;
export const getShowMapsInspectorAdapter = () => getMapAppConfig().showMapsInspectorAdapter;
export const getPreserveDrawingBuffer = () => getMapAppConfig().preserveDrawingBuffer;

// map.* kibana.yml settings from maps_legacy plugin that are shared between OSS map visualizations and maps app
let kibanaCommonConfig: MapsLegacyConfigType;
export const setKibanaCommonConfig = (config: MapsLegacyConfigType) =>
  (kibanaCommonConfig = config);
export const getKibanaCommonConfig = () => kibanaCommonConfig;

export const getIsEmsEnabled = () => getKibanaCommonConfig().includeElasticMapsService;
export const getEmsFontLibraryUrl = () => getKibanaCommonConfig().emsFontLibraryUrl;
export const getEmsTileLayerId = () => getKibanaCommonConfig().emsTileLayerId;
export const getEmsFileApiUrl = () => getKibanaCommonConfig().emsFileApiUrl;
export const getEmsTileApiUrl = () => getKibanaCommonConfig().emsTileApiUrl;
export const getEmsLandingPageUrl = () => getKibanaCommonConfig().emsLandingPageUrl;
export const getProxyElasticMapsServiceInMaps = () =>
  getKibanaCommonConfig().proxyElasticMapsServiceInMaps;
export const getRegionmapLayers = () => _.get(getKibanaCommonConfig(), 'regionmap.layers', []);
export const getTilemap = () => _.get(getKibanaCommonConfig(), 'tilemap', []);

export async function fetchSearchSourceAndRecordWithInspector({
  searchSource,
  requestId,
  requestName,
  requestDesc,
  inspectorAdapters,
  abortSignal,
}: {
  searchSource: ISearchSource;
  requestId: string;
  requestName: string;
  requestDesc: string;
  inspectorAdapters: Adapters;
  abortSignal: AbortSignal;
}) {
  const inspectorRequest = inspectorAdapters.requests.start(requestName, {
    id: requestId,
    description: requestDesc,
  });
  let resp;
  try {
    inspectorRequest.stats(getRequestInspectorStats(searchSource));
    searchSource.getSearchRequestBody().then((body) => {
      inspectorRequest.json(body);
    });
    resp = await searchSource.fetch({ abortSignal });
    inspectorRequest.stats(getResponseInspectorStats(resp, searchSource)).ok({ json: resp });
  } catch (error) {
    inspectorRequest.error({ error });
    throw error;
  }

  return resp;
}
