/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DataPublicPluginStart } from 'src/plugins/data/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IndexPatternsService } from 'src/plugins/data/public/index_patterns';
import { MapsConfigType } from '../config';
import { MapsLegacyConfigType } from '../../../../src/plugins/maps_legacy/public';

export function getLicenseId(): any;
export function getInspector(): any;
export function getFileUploadComponent(): any;
export function getIndexPatternSelectComponent(): any;
export function getHttp(): any;
export function getTimeFilter(): any;
export function getToasts(): any;
export function getIndexPatternService(): IndexPatternsService;
export function getAutocompleteService(): any;
export function getSavedObjectsClient(): any;
export function getMapsCapabilities(): any;
export function getVisualizations(): any;
export function getDocLinks(): any;
export function getCoreChrome(): any;
export function getUiSettings(): any;
export function getCoreOverlays(): any;
export function getData(): any;
export function getUiActions(): any;
export function getCore(): any;
export function getNavigation(): any;
export function getCoreI18n(): any;
export function getSearchService(): DataPublicPluginStart['search'];
export function getKibanaCommonConfig(): MapsLegacyConfigType;
export function getMapAppConfig(): MapsConfigType;
export function getIsEmsEnabled(): any;
export function getEmsFontLibraryUrl(): any;
export function getEmsTileLayerId(): any;
export function getEmsFileApiUrl(): any;
export function getEmsTileApiUrl(): any;
export function getEmsLandingPageUrl(): any;
export function getRegionmapLayers(): any;
export function getTilemap(): any;
export function getKibanaVersion(): string;
export function getEnabled(): boolean;
export function getShowMapVisualizationTypes(): boolean;
export function getShowMapsInspectorAdapter(): boolean;
export function getPreserveDrawingBuffer(): boolean;
export function getEnableVectorTiles(): boolean;
export function getProxyElasticMapsServiceInMaps(): boolean;
export function getIsGoldPlus(): boolean;

export function setLicenseId(args: unknown): void;
export function setInspector(args: unknown): void;
export function setFileUpload(args: unknown): void;
export function setIndexPatternSelect(args: unknown): void;
export function setHttp(args: unknown): void;
export function setTimeFilter(args: unknown): void;
export function setToasts(args: unknown): void;
export function setIndexPatternService(args: unknown): void;
export function setAutocompleteService(args: unknown): void;
export function setSavedObjectsClient(args: unknown): void;
export function setMapsCapabilities(args: unknown): void;
export function setVisualizations(args: unknown): void;
export function setDocLinks(args: unknown): void;
export function setCoreChrome(args: unknown): void;
export function setUiSettings(args: unknown): void;
export function setCoreOverlays(args: unknown): void;
export function setData(args: unknown): void;
export function setUiActions(args: unknown): void;
export function setCore(args: unknown): void;
export function setNavigation(args: unknown): void;
export function setCoreI18n(args: unknown): void;
export function setSearchService(args: DataPublicPluginStart['search']): void;
export function setKibanaCommonConfig(config: MapsLegacyConfigType): void;
export function setMapAppConfig(config: MapsConfigType): void;
export function setKibanaVersion(version: string): void;
export function setIsGoldPlus(isGoldPlus: boolean): void;
