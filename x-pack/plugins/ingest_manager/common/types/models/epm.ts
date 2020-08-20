/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Follow pattern from https://github.com/elastic/kibana/pull/52447
// TODO: Update when https://github.com/elastic/kibana/issues/53021 is closed
import { SavedObject, SavedObjectAttributes, SavedObjectReference } from 'src/core/public';

export enum InstallationStatus {
  installed = 'installed',
  notInstalled = 'not_installed',
}
export enum InstallStatus {
  installed = 'installed',
  notInstalled = 'not_installed',
  installing = 'installing',
  uninstalling = 'uninstalling',
}

export type EpmPackageInstallStatus = 'installed' | 'installing';

export type DetailViewPanelName = 'overview' | 'usages' | 'settings';
export type ServiceName = 'kibana' | 'elasticsearch';
export type AssetType = KibanaAssetType | ElasticsearchAssetType | AgentAssetType;

export enum KibanaAssetType {
  dashboard = 'dashboard',
  visualization = 'visualization',
  search = 'search',
  indexPattern = 'index-pattern',
  map = 'map',
}

export enum ElasticsearchAssetType {
  componentTemplate = 'component_template',
  ingestPipeline = 'ingest_pipeline',
  indexTemplate = 'index_template',
  ilmPolicy = 'ilm_policy',
}

export enum AgentAssetType {
  input = 'input',
}

export type RegistryRelease = 'ga' | 'beta' | 'experimental';

// from /package/{name}
// type Package struct at https://github.com/elastic/package-registry/blob/master/util/package.go
// https://github.com/elastic/package-registry/blob/master/docs/api/package.json
export interface RegistryPackage {
  name: string;
  title?: string;
  version: string;
  release?: RegistryRelease;
  readme?: string;
  description: string;
  type: string;
  categories: string[];
  requirement: RequirementsByServiceName;
  screenshots?: RegistryImage[];
  icons?: RegistryImage[];
  assets?: string[];
  internal?: boolean;
  format_version: string;
  datasets?: Dataset[];
  config_templates?: RegistryConfigTemplate[];
  download: string;
  path: string;
}

interface RegistryImage {
  // https://github.com/elastic/package-registry/blob/master/util/package.go#L74
  // says src is potentially missing but I couldn't find any examples
  // it seems like src should be required. How can you have an image with no reference to the content?
  src: string;
  title?: string;
  size?: string;
  type?: string;
}
export interface RegistryConfigTemplate {
  name: string;
  title: string;
  description: string;
  inputs: RegistryInput[];
  multiple?: boolean;
}

export interface RegistryInput {
  type: string;
  title: string;
  description?: string;
  vars?: RegistryVarsEntry[];
}

export interface RegistryStream {
  input: string;
  title: string;
  description?: string;
  enabled?: boolean;
  vars?: RegistryVarsEntry[];
  template_path: string;
}

export type RequirementVersion = string;
export type RequirementVersionRange = string;
export interface ServiceRequirements {
  versions: RequirementVersionRange;
}

// Registry's response types
// from /search
// https://github.com/elastic/package-registry/blob/master/docs/api/search.json
export type RegistrySearchResults = RegistrySearchResult[];
// from getPackageOutput at https://github.com/elastic/package-registry/blob/master/search.go
export type RegistrySearchResult = Pick<
  RegistryPackage,
  | 'name'
  | 'title'
  | 'version'
  | 'release'
  | 'description'
  | 'type'
  | 'icons'
  | 'internal'
  | 'download'
  | 'path'
  | 'datasets'
  | 'config_templates'
>;

export type ScreenshotItem = RegistryImage;

// from /categories
// https://github.com/elastic/package-registry/blob/master/docs/api/categories.json
export type CategorySummaryList = CategorySummaryItem[];
export type CategoryId = string;
export interface CategorySummaryItem {
  id: CategoryId;
  title: string;
  count: number;
}

export type RequirementsByServiceName = Record<ServiceName, ServiceRequirements>;
export interface AssetParts {
  pkgkey: string;
  dataset?: string;
  service: ServiceName;
  type: AssetType;
  file: string;
}
export type AssetTypeToParts = KibanaAssetTypeToParts & ElasticsearchAssetTypeToParts;
export type AssetsGroupedByServiceByType = Record<
  Extract<ServiceName, 'kibana'>,
  KibanaAssetTypeToParts
>;
// & Record<Extract<ServiceName, 'elasticsearch'>, ElasticsearchAssetTypeToParts>;

export type KibanaAssetParts = AssetParts & {
  service: Extract<ServiceName, 'kibana'>;
  type: KibanaAssetType;
};

export type ElasticsearchAssetParts = AssetParts & {
  service: Extract<ServiceName, 'elasticsearch'>;
  type: ElasticsearchAssetType;
};

export type KibanaAssetTypeToParts = Record<KibanaAssetType, KibanaAssetParts[]>;
export type ElasticsearchAssetTypeToParts = Record<
  ElasticsearchAssetType,
  ElasticsearchAssetParts[]
>;

export interface Dataset {
  type: string;
  name: string;
  title: string;
  release: string;
  streams?: RegistryStream[];
  package: string;
  path: string;
  ingest_pipeline: string;
  elasticsearch?: RegistryElasticsearch;
}

export interface RegistryElasticsearch {
  'index_template.settings'?: object;
  'index_template.mappings'?: object;
}

// EPR types this as `[]map[string]interface{}`
// which means the official/possible type is Record<string, any>
// but we effectively only see this shape
export interface RegistryVarsEntry {
  name: string;
  title?: string;
  description?: string;
  type: string;
  required?: boolean;
  show_user?: boolean;
  multi?: boolean;
  default?: string | string[];
  os?: {
    [key: string]: {
      default: string | string[];
    };
  };
}

// some properties are optional in Registry responses but required in EPM
// internal until we need them
interface PackageAdditions {
  title: string;
  latestVersion: string;
  assets: AssetsGroupedByServiceByType;
  removable?: boolean;
}

// Managers public HTTP response types
export type PackageList = PackageListItem[];

export type PackageListItem = Installable<RegistrySearchResult>;
export type PackagesGroupedByStatus = Record<InstallationStatus, PackageList>;
export type PackageInfo = Installable<
  // remove the properties we'll be altering/replacing from the base type
  Omit<RegistryPackage, keyof PackageAdditions> &
    // now add our replacement definitions
    PackageAdditions
>;

export interface Installation extends SavedObjectAttributes {
  installed_kibana: KibanaAssetReference[];
  installed_es: EsAssetReference[];
  es_index_patterns: Record<string, string>;
  name: string;
  version: string;
  install_status: EpmPackageInstallStatus;
  install_version: string;
  install_started_at: string;
}

export type Installable<T> = Installed<T> | NotInstalled<T>;

export type Installed<T = {}> = T & {
  status: InstallationStatus.installed;
  savedObject: SavedObject<Installation>;
};

export type NotInstalled<T = {}> = T & {
  status: InstallationStatus.notInstalled;
};

export type AssetReference = KibanaAssetReference | EsAssetReference;

export type KibanaAssetReference = Pick<SavedObjectReference, 'id'> & {
  type: KibanaAssetType;
};
export type EsAssetReference = Pick<SavedObjectReference, 'id'> & {
  type: ElasticsearchAssetType;
};

export enum DefaultPackages {
  system = 'system',
  endpoint = 'endpoint',
}

export interface IndexTemplateMappings {
  properties: any;
}

// This is an index template v2, see https://github.com/elastic/elasticsearch/issues/53101
// until "proper" documentation of the new format is available.
// Ingest Manager does not use nor support the legacy index template v1 format at all
export interface IndexTemplate {
  priority: number;
  index_patterns: string[];
  template: {
    settings: any;
    mappings: any;
    aliases: object;
  };
  data_stream: object;
  composed_of: string[];
  _meta: object;
}

export interface TemplateRef {
  templateName: string;
  indexTemplate: IndexTemplate;
}
