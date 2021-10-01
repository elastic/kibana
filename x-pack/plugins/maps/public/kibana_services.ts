/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from 'kibana/public';
import type { MapsEmsConfig } from '../../../../src/plugins/maps_ems/public';
import type { MapsConfigType } from '../config';
import type { MapsPluginStartDependencies } from './plugin';
import type { EMSSettings } from '../common/ems_settings';
import type { PaletteRegistry } from '../../../../src/plugins/charts/public';

let kibanaVersion: string;
export const setKibanaVersion = (version: string) => (kibanaVersion = version);
export const getKibanaVersion = () => kibanaVersion;

let coreStart: CoreStart;
let pluginsStart: MapsPluginStartDependencies;
export function setStartServices(core: CoreStart, plugins: MapsPluginStartDependencies) {
  coreStart = core;
  pluginsStart = plugins;
}

export const getIndexNameFormComponent = () => pluginsStart.fileUpload.IndexNameFormComponent;
export const getFileUploadComponent = () => pluginsStart.fileUpload.FileUploadComponent;
export const getIndexPatternService = () => pluginsStart.data.indexPatterns;
export const getAutocompleteService = () => pluginsStart.data.autocomplete;
export const getInspector = () => pluginsStart.inspector;
export const getFileUpload = () => pluginsStart.fileUpload;
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
export const getSavedObjectsTagging = () => pluginsStart.savedObjectsTagging;
export const getPresentationUtilContext = () => pluginsStart.presentationUtil.ContextProvider;
export const getSecurityService = () => pluginsStart.security;

// xpack.maps.* kibana.yml settings from this plugin
let mapAppConfig: MapsConfigType;
export const setMapAppConfig = (config: MapsConfigType) => (mapAppConfig = config);
export const getMapAppConfig = () => mapAppConfig;

export const getShowMapsInspectorAdapter = () => getMapAppConfig().showMapsInspectorAdapter;
export const getPreserveDrawingBuffer = () => getMapAppConfig().preserveDrawingBuffer;

// map.* kibana.yml settings from maps_ems plugin that are shared between OSS map visualizations and maps app
let kibanaCommonConfig: MapsEmsConfig;
export const setKibanaCommonConfig = (config: MapsEmsConfig) => (kibanaCommonConfig = config);
export const getKibanaCommonConfig = () => kibanaCommonConfig;

let emsSettings: EMSSettings;
export const setEMSSettings = (value: EMSSettings) => {
  emsSettings = value;
};
export const getEMSSettings = () => {
  return emsSettings;
};

export const getEmsTileLayerId = () => getKibanaCommonConfig().emsTileLayerId;

export const getRegionmapLayers = () => {
  const config = getKibanaCommonConfig();
  if (config.regionmap && config.regionmap.layers) {
    return config.regionmap.layers;
  } else {
    return [];
  }
};
export const getTilemap = () => {
  const config = getKibanaCommonConfig();
  if (config.tilemap) {
    return config.tilemap;
  } else {
    return {};
  }
};

export const getShareService = () => pluginsStart.share;

export const getIsAllowByValueEmbeddables = () =>
  pluginsStart.dashboard.dashboardFeatureFlagConfig.allowByValueEmbeddables;

export async function getChartsPaletteServiceGetColor(): Promise<
  ((value: string) => string) | null
> {
  const paletteRegistry: PaletteRegistry | null = pluginsStart.charts
    ? await pluginsStart.charts.palettes.getPalettes()
    : null;
  if (!paletteRegistry) {
    return null;
  }

  const paletteDefinition = paletteRegistry.get('default');
  const chartConfiguration = { syncColors: true };
  return (value: string) => {
    const series = [{ name: value, rankAtDepth: 0, totalSeriesAtDepth: 1 }];
    const color = paletteDefinition.getCategoricalColor(series, chartConfiguration);
    return color ? color : '#3d3d3d';
  };
}
