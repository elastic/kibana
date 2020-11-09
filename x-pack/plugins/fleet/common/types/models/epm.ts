/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Follow pattern from https://github.com/elastic/kibana/pull/52447
// TODO: Update when https://github.com/elastic/kibana/issues/53021 is closed
import { SavedObject, SavedObjectAttributes, SavedObjectReference } from 'src/core/public';
import {
  agentAssetTypes,
  dataTypes,
  defaultPackages,
  installationStatuses,
  requiredPackages,
} from '../../constants';
import { ValueOf } from '../../types';

export type InstallationStatus = typeof installationStatuses;

export enum InstallStatus {
  installed = 'installed',
  notInstalled = 'not_installed',
  installing = 'installing',
  uninstalling = 'uninstalling',
}

export type InstallType = 'reinstall' | 'reupdate' | 'rollback' | 'update' | 'install';
export type InstallSource = 'registry' | 'upload';

export type EpmPackageInstallStatus = 'installed' | 'installing';

export type DetailViewPanelName = 'overview' | 'usages' | 'settings';
export type ServiceName = 'kibana' | 'elasticsearch';
export type AgentAssetType = typeof agentAssetTypes;
export type AssetType = KibanaAssetType | ElasticsearchAssetType | ValueOf<AgentAssetType>;

/*
  Enum mapping of a saved object asset type to how it would appear in a package file path (snake cased)
*/
export enum KibanaAssetType {
  dashboard = 'dashboard',
  visualization = 'visualization',
  search = 'search',
  indexPattern = 'index_pattern',
  map = 'map',
}

/*
 Enum of saved object types that are allowed to be installed 
*/
export enum KibanaSavedObjectType {
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
  transform = 'transform',
}

export type DataType = typeof dataTypes;

export type RegistryRelease = 'ga' | 'beta' | 'experimental';

// Fields common to packages that come from direct upload and the registry
export interface InstallablePackage {
  name: string;
  title?: string;
  version: string;
  release?: RegistryRelease;
  readme?: string;
  description: string;
  type: string;
  categories: string[];
  screenshots?: RegistryImage[];
  icons?: RegistryImage[];
  assets?: string[];
  internal?: boolean;
  format_version: string;
  data_streams?: RegistryDataStream[];
  policy_templates?: RegistryPolicyTemplate[];
}

// Uploaded package archives don't have extra fields
// Linter complaint disabled because this extra type is meant for better code readability
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ArchivePackage extends InstallablePackage {}

// Registry packages do have extra fields.
// cf. type Package struct at https://github.com/elastic/package-registry/blob/master/util/package.go
export interface RegistryPackage extends InstallablePackage {
  requirement: RequirementsByServiceName;
  download: string;
  path: string;
}

interface RegistryImage {
  src: string;
  path: string;
  title?: string;
  size?: string;
  type?: string;
}
export interface RegistryPolicyTemplate {
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
  | 'data_streams'
  | 'policy_templates'
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

export interface RegistryDataStream {
  type: string;
  dataset: string;
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
export type PackagesGroupedByStatus = Record<ValueOf<InstallationStatus>, PackageList>;
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
  install_source: InstallSource;
}

export type Installable<T> = Installed<T> | NotInstalled<T>;

export type Installed<T = {}> = T & {
  status: InstallationStatus['Installed'];
  savedObject: SavedObject<Installation>;
};

export type NotInstalled<T = {}> = T & {
  status: InstallationStatus['NotInstalled'];
};

export type AssetReference = KibanaAssetReference | EsAssetReference;

export type KibanaAssetReference = Pick<SavedObjectReference, 'id'> & {
  type: KibanaSavedObjectType;
};
export type EsAssetReference = Pick<SavedObjectReference, 'id'> & {
  type: ElasticsearchAssetType;
};

export type RequiredPackage = typeof requiredPackages;

export type DefaultPackages = typeof defaultPackages;

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
