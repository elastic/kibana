/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { esFilters, search } from '../../../../src/plugins/data/public';
import _ from 'lodash';

export const SPATIAL_FILTER_TYPE = esFilters.FILTERS.SPATIAL_FILTER;
const { getRequestInspectorStats, getResponseInspectorStats } = search;

let indexPatternService;
export const setIndexPatternService = (dataIndexPatterns) =>
  (indexPatternService = dataIndexPatterns);
export const getIndexPatternService = () => indexPatternService;

let autocompleteService;
export const setAutocompleteService = (dataAutoComplete) =>
  (autocompleteService = dataAutoComplete);
export const getAutocompleteService = () => autocompleteService;

let licenseId;
export const setLicenseId = (latestLicenseId) => (licenseId = latestLicenseId);
export const getLicenseId = () => {
  return licenseId;
};

let inspector;
export const setInspector = (newInspector) => (inspector = newInspector);
export const getInspector = () => {
  return inspector;
};

let fileUploadPlugin;
export const setFileUpload = (fileUpload) => (fileUploadPlugin = fileUpload);
export const getFileUploadComponent = () => {
  return fileUploadPlugin.JsonUploadAndParse;
};

let uiSettings;
export const setUiSettings = (coreUiSettings) => (uiSettings = coreUiSettings);
export const getUiSettings = () => uiSettings;
export const getIsDarkMode = () => {
  return getUiSettings().get('theme:darkMode', false);
};

let indexPatternSelectComponent;
export const setIndexPatternSelect = (indexPatternSelect) =>
  (indexPatternSelectComponent = indexPatternSelect);
export const getIndexPatternSelectComponent = () => indexPatternSelectComponent;

let coreHttp;
export const setHttp = (http) => (coreHttp = http);
export const getHttp = () => coreHttp;

let dataTimeFilter;
export const setTimeFilter = (timeFilter) => (dataTimeFilter = timeFilter);
export const getTimeFilter = () => dataTimeFilter;

let toast;
export const setToasts = (notificationToast) => (toast = notificationToast);
export const getToasts = () => toast;

export async function fetchSearchSourceAndRecordWithInspector({
  searchSource,
  requestId,
  requestName,
  requestDesc,
  inspectorAdapters,
  abortSignal,
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
    inspectorRequest.stats(getResponseInspectorStats(searchSource, resp)).ok({ json: resp });
  } catch (error) {
    inspectorRequest.error({ error });
    throw error;
  }

  return resp;
}

let savedObjectsClient;
export const setSavedObjectsClient = (coreSavedObjectsClient) =>
  (savedObjectsClient = coreSavedObjectsClient);
export const getSavedObjectsClient = () => savedObjectsClient;

let chrome;
export const setCoreChrome = (coreChrome) => (chrome = coreChrome);
export const getCoreChrome = () => chrome;

let mapsCapabilities;
export const setMapsCapabilities = (coreAppMapsCapabilities) =>
  (mapsCapabilities = coreAppMapsCapabilities);
export const getMapsCapabilities = () => mapsCapabilities;

let visualizations;
export const setVisualizations = (visPlugin) => (visualizations = visPlugin);
export const getVisualizations = () => visualizations;

let docLinks;
export const setDocLinks = (coreDocLinks) => (docLinks = coreDocLinks);
export const getDocLinks = () => docLinks;

let overlays;
export const setCoreOverlays = (coreOverlays) => (overlays = coreOverlays);
export const getCoreOverlays = () => overlays;

let data;
export const setData = (dataPlugin) => (data = dataPlugin);
export const getData = () => data;

let uiActions;
export const setUiActions = (pluginUiActions) => (uiActions = pluginUiActions);
export const getUiActions = () => uiActions;

let core;
export const setCore = (kibanaCore) => (core = kibanaCore);
export const getCore = () => core;

let navigation;
export const setNavigation = (pluginNavigation) => (navigation = pluginNavigation);
export const getNavigation = () => navigation;

let coreI18n;
export const setCoreI18n = (kibanaCoreI18n) => (coreI18n = kibanaCoreI18n);
export const getCoreI18n = () => coreI18n;

let dataSearchService;
export const setSearchService = (searchService) => (dataSearchService = searchService);
export const getSearchService = () => dataSearchService;

let kibanaVersion;
export const setKibanaVersion = (version) => (kibanaVersion = version);
export const getKibanaVersion = () => kibanaVersion;

// xpack.maps.* kibana.yml settings from this plugin
let mapAppConfig;
export const setMapAppConfig = (config) => (mapAppConfig = config);
export const getMapAppConfig = () => mapAppConfig;

export const getEnabled = () => getMapAppConfig().enabled;
export const getShowMapVisualizationTypes = () => getMapAppConfig().showMapVisualizationTypes;
export const getShowMapsInspectorAdapter = () => getMapAppConfig().showMapsInspectorAdapter;
export const getPreserveDrawingBuffer = () => getMapAppConfig().preserveDrawingBuffer;

// map.* kibana.yml settings from maps_legacy plugin that are shared between OSS map visualizations and maps app
let kibanaCommonConfig;
export const setKibanaCommonConfig = (config) => (kibanaCommonConfig = config);
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

let isGoldPlus = false;
export const setIsGoldPlus = (igp) => {
  isGoldPlus = igp;
};

export const getIsGoldPlus = () => {
  return isGoldPlus;
};
