/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { CoreStart } from 'kibana/public';
import { MapsLegacyConfig } from '../../../../src/plugins/maps_legacy/config';
import { MapsConfigType } from '../config';
import { MapsPluginStartDependencies } from './plugin';
import { EMSSettings } from '../common/ems_settings';

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
export const getFileUploadComponent = async () => {
  return await pluginsStart.fileUpload.getFileUploadComponent();
};
export const getUiSettings = () => coreStart.uiSettings;
export const getIsDarkMode = () => getUiSettings().get('theme:darkMode', false);
export const getIndexPatternSelectComponent = () => pluginsStart.data.ui.IndexPatternSelect;
export const getHttp = () => coreStart.http;
export const getTimeFilter = () => pluginsStart.data.query.timefilter.timefilter;
export const getToasts = () => coreStart.notifications.toasts;
export const getSavedObjectsClient = () => coreStart.savedObjects.client;
export const getCoreChrome = () => coreStart.chrome;
export const getMapsCapabilities = () => coreStart.application.capabilities.maps;
export const getVisualizeCapabilities = () => coreStart.application.capabilities.visualize;
export const getDocLinks = () => coreStart.docLinks;
export const getCoreOverlays = () => coreStart.overlays;
export const getData = () => pluginsStart.data;
export const getSavedObjects = () => pluginsStart.savedObjects;
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
let kibanaCommonConfig: MapsLegacyConfig;
export const setKibanaCommonConfig = (config: MapsLegacyConfig) => (kibanaCommonConfig = config);
export const getKibanaCommonConfig = () => kibanaCommonConfig;

let emsSettings: EMSSettings;
export const setEMSSettings = (value: EMSSettings) => {
  emsSettings = value;
};
export const getEMSSettings = () => {
  return emsSettings;
};

export const getEmsTileLayerId = () => getKibanaCommonConfig().emsTileLayerId;

export const getRegionmapLayers = () => _.get(getKibanaCommonConfig(), 'regionmap.layers', []);
export const getTilemap = () => _.get(getKibanaCommonConfig(), 'tilemap', []);

export const getShareService = () => pluginsStart.share;

export const getIsAllowByValueEmbeddables = () =>
  pluginsStart.dashboard.dashboardFeatureFlagConfig.allowByValueEmbeddables;
