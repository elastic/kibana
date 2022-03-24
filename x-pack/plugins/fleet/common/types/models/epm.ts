/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
// Follow pattern from https://github.com/elastic/kibana/pull/52447
// TODO: Update when https://github.com/elastic/kibana/issues/53021 is closed
import type { SavedObject, SavedObjectAttributes, SavedObjectReference } from 'src/core/public';

import type {
  ASSETS_SAVED_OBJECT_TYPE,
  agentAssetTypes,
  dataTypes,
  monitoringTypes,
  installationStatuses,
} from '../../constants';
import type { ValueOf } from '../../types';

import type { CustomIntegrationIcon } from '../../../../../../src/plugins/custom_integrations/common';

import type {
  PackageSpecManifest,
  PackageSpecIcon,
  PackageSpecScreenshot,
  PackageSpecCategory,
} from './package_spec';

export type InstallationStatus = typeof installationStatuses;

export enum InstallStatus {
  installed = 'installed',
  notInstalled = 'not_installed',
  installing = 'installing',
  uninstalling = 'uninstalling',
}

export interface DefaultPackagesInstallationError {
  installType: InstallType;
  error: Error;
}

export type InstallType = 'reinstall' | 'reupdate' | 'rollback' | 'update' | 'install' | 'unknown';
export type InstallSource = 'registry' | 'upload' | 'bundled';

export type EpmPackageInstallStatus =
  | 'installed'
  | 'installing'
  | 'install_failed'
  | 'installed_bundled';

export type DetailViewPanelName = 'overview' | 'policies' | 'assets' | 'settings' | 'custom';
export type ServiceName = 'kibana' | 'elasticsearch';
export type AgentAssetType = typeof agentAssetTypes;
export type DocAssetType = 'doc' | 'notice';
export type AssetType =
  | KibanaAssetType
  | ElasticsearchAssetType
  | ValueOf<AgentAssetType>
  | DocAssetType;

/*
  Enum mapping of a saved object asset type to how it would appear in a package file path (snake cased)
*/
export enum KibanaAssetType {
  dashboard = 'dashboard',
  visualization = 'visualization',
  search = 'search',
  indexPattern = 'index_pattern',
  map = 'map',
  lens = 'lens',
  securityRule = 'security_rule',
  cloudSecurityPostureRuleTemplate = 'csp_rule_template',
  mlModule = 'ml_module',
  tag = 'tag',
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
  lens = 'lens',
  mlModule = 'ml-module',
  securityRule = 'security-rule',
  cloudSecurityPostureRuleTemplate = 'csp-rule-template',
  tag = 'tag',
}

export enum ElasticsearchAssetType {
  componentTemplate = 'component_template',
  ingestPipeline = 'ingest_pipeline',
  indexTemplate = 'index_template',
  ilmPolicy = 'ilm_policy',
  transform = 'transform',
  dataStreamIlmPolicy = 'data_stream_ilm_policy',
  mlModel = 'ml_model',
}

export type DataType = typeof dataTypes;
export type MonitoringType = typeof monitoringTypes;
export type InstallablePackage = RegistryPackage | ArchivePackage;

export type ArchivePackage = PackageSpecManifest &
  // should an uploaded package be able to specify `internal`?
  Pick<RegistryPackage, 'readme' | 'assets' | 'data_streams' | 'internal' | 'elasticsearch'>;

export interface BundledPackage {
  name: string;
  version: string;
  buffer: Buffer;
}

export type RegistryPackage = PackageSpecManifest &
  Partial<RegistryOverridesToOptional> &
  RegistryAdditionalProperties &
  RegistryOverridePropertyValue;

// Registry packages do have extra fields.
// cf. type Package struct at https://github.com/elastic/package-registry/blob/master/util/package.go
type RegistryOverridesToOptional = Pick<PackageSpecManifest, 'title' | 'release'>;

// our current types have `download`, & `path` as required but they're are optional (have `omitempty`) according to
// https://github.com/elastic/package-registry/blob/master/util/package.go#L57
// & https://github.com/elastic/package-registry/blob/master/util/package.go#L80-L81
// However, they are always present in every registry response I checked. Chose to keep types unchanged for now
// and confirm with Registry if they are really optional. Can update types and ~4 places in code later if neccessary
interface RegistryAdditionalProperties {
  assets?: string[];
  download: string;
  path: string;
  readme?: string;
  internal?: boolean; // Registry addition[0] and EPM uses it[1] [0]: https://github.com/elastic/package-registry/blob/dd7b021893aa8d66a5a5fde963d8ff2792a9b8fa/util/package.go#L63 [1]
  data_streams?: RegistryDataStream[]; // Registry addition [0] [0]: https://github.com/elastic/package-registry/blob/dd7b021893aa8d66a5a5fde963d8ff2792a9b8fa/util/package.go#L65
  elasticsearch?: {
    privileges?: {
      cluster?: string[];
    };
  };
}
interface RegistryOverridePropertyValue {
  icons?: RegistryImage[];
  screenshots?: RegistryImage[];
}

export type RegistryRelease = PackageSpecManifest['release'];
export interface RegistryImage extends PackageSpecIcon {
  path: string;
}

export enum RegistryPolicyTemplateKeys {
  name = 'name',
  title = 'title',
  description = 'description',
  icons = 'icons',
  screenshots = 'screenshots',
  categories = 'categories',
  data_streams = 'data_streams',
  inputs = 'inputs',
  readme = 'readme',
  multiple = 'multiple',
}

export interface RegistryPolicyTemplate {
  [RegistryPolicyTemplateKeys.name]: string;
  [RegistryPolicyTemplateKeys.title]: string;
  [RegistryPolicyTemplateKeys.description]: string;
  [RegistryPolicyTemplateKeys.icons]?: RegistryImage[];
  [RegistryPolicyTemplateKeys.screenshots]?: RegistryImage[];
  [RegistryPolicyTemplateKeys.categories]?: Array<PackageSpecCategory | undefined>;
  [RegistryPolicyTemplateKeys.data_streams]?: string[];
  [RegistryPolicyTemplateKeys.inputs]?: RegistryInput[];
  [RegistryPolicyTemplateKeys.readme]?: string;
  [RegistryPolicyTemplateKeys.multiple]?: boolean;
}

export enum RegistryInputKeys {
  type = 'type',
  title = 'title',
  description = 'description',
  template_path = 'template_path',
  condition = 'condition',
  input_group = 'input_group',
  vars = 'vars',
}

export type RegistryInputGroup = 'logs' | 'metrics';

export interface RegistryInput {
  [RegistryInputKeys.type]: string;
  [RegistryInputKeys.title]: string;
  [RegistryInputKeys.description]: string;
  [RegistryInputKeys.template_path]?: string;
  [RegistryInputKeys.condition]?: string;
  [RegistryInputKeys.input_group]?: RegistryInputGroup;
  [RegistryInputKeys.vars]?: RegistryVarsEntry[];
}

export enum RegistryStreamKeys {
  input = 'input',
  title = 'title',
  description = 'description',
  enabled = 'enabled',
  vars = 'vars',
  template_path = 'template_path',
}

export interface RegistryStream {
  [RegistryStreamKeys.input]: string;
  [RegistryStreamKeys.title]: string;
  [RegistryStreamKeys.description]?: string;
  [RegistryStreamKeys.enabled]?: boolean;
  [RegistryStreamKeys.vars]?: RegistryVarsEntry[];
  [RegistryStreamKeys.template_path]: string;
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
  | 'download'
  | 'path'
  | 'icons'
  | 'internal'
  | 'data_streams'
  | 'policy_templates'
  | 'categories'
>;

export type ScreenshotItem = RegistryImage | PackageSpecScreenshot;

// from /categories
// https://github.com/elastic/package-registry/blob/master/docs/api/categories.json
export type CategorySummaryList = CategorySummaryItem[];
export type CategoryId = string;
export interface CategorySummaryItem {
  id: CategoryId;
  title: string;
  count: number;
}

export type RequirementsByServiceName = PackageSpecManifest['conditions'];
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
> &
  Record<Extract<ServiceName, 'elasticsearch'>, ElasticsearchAssetTypeToParts>;

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

export enum RegistryDataStreamKeys {
  type = 'type',
  ilm_policy = 'ilm_policy',
  hidden = 'hidden',
  dataset = 'dataset',
  title = 'title',
  release = 'release',
  streams = 'streams',
  package = 'package',
  path = 'path',
  ingest_pipeline = 'ingest_pipeline',
  elasticsearch = 'elasticsearch',
  dataset_is_prefix = 'dataset_is_prefix',
}

export interface RegistryDataStream {
  [key: string]: any;
  [RegistryDataStreamKeys.type]: string;
  [RegistryDataStreamKeys.ilm_policy]?: string;
  [RegistryDataStreamKeys.hidden]?: boolean;
  [RegistryDataStreamKeys.dataset]: string;
  [RegistryDataStreamKeys.title]: string;
  [RegistryDataStreamKeys.release]: string;
  [RegistryDataStreamKeys.streams]?: RegistryStream[];
  [RegistryDataStreamKeys.package]: string;
  [RegistryDataStreamKeys.path]: string;
  [RegistryDataStreamKeys.ingest_pipeline]?: string;
  [RegistryDataStreamKeys.elasticsearch]?: RegistryElasticsearch;
  [RegistryDataStreamKeys.dataset_is_prefix]?: boolean;
}

export interface RegistryElasticsearch {
  privileges?: RegistryDataStreamPrivileges;
  'index_template.settings'?: estypes.IndicesIndexSettings;
  'index_template.mappings'?: estypes.MappingTypeMapping;
  'ingest_pipeline.name'?: string;
}

export interface RegistryDataStreamPrivileges {
  cluster?: string[];
  indices?: string[];
}

export type RegistryVarType = 'integer' | 'bool' | 'password' | 'text' | 'yaml' | 'string';
export enum RegistryVarsEntryKeys {
  name = 'name',
  title = 'title',
  description = 'description',
  type = 'type',
  required = 'required',
  show_user = 'show_user',
  multi = 'multi',
  default = 'default',
  os = 'os',
}

// EPR types this as `[]map[string]interface{}`
// which means the official/possible type is Record<string, any>
// but we effectively only see this shape
export interface RegistryVarsEntry {
  [RegistryVarsEntryKeys.name]: string;
  [RegistryVarsEntryKeys.title]?: string;
  [RegistryVarsEntryKeys.description]?: string;
  [RegistryVarsEntryKeys.type]: RegistryVarType;
  [RegistryVarsEntryKeys.required]?: boolean;
  [RegistryVarsEntryKeys.show_user]?: boolean;
  [RegistryVarsEntryKeys.multi]?: boolean;
  [RegistryVarsEntryKeys.default]?: string | string[] | boolean;
  [RegistryVarsEntryKeys.os]?: {
    [key: string]: {
      default: string | string[];
    };
  };
}

// some properties are optional in Registry responses but required in EPM
// internal until we need them
export interface EpmPackageAdditions {
  title: string;
  latestVersion: string;
  assets: AssetsGroupedByServiceByType;
  removable?: boolean;
  notice?: string;
  keepPoliciesUpToDate?: boolean;
}

type Merge<FirstType, SecondType> = Omit<FirstType, Extract<keyof FirstType, keyof SecondType>> &
  SecondType;

// Managers public HTTP response types
export type PackageList = PackageListItem[];
export type PackageListItem = Installable<RegistrySearchResult> & {
  integration?: string;
  id: string;
};

export interface IntegrationCardItem {
  url: string;
  release?: 'beta' | 'experimental' | 'ga';
  description: string;
  name: string;
  title: string;
  version: string;
  icons: Array<PackageSpecIcon | CustomIntegrationIcon>;
  integration: string;
  id: string;
  categories: string[];
}

export type PackagesGroupedByStatus = Record<ValueOf<InstallationStatus>, PackageList>;
export type PackageInfo =
  | Installable<Merge<RegistryPackage, EpmPackageAdditions>>
  | Installable<Merge<ArchivePackage, EpmPackageAdditions>>;

export interface Installation extends SavedObjectAttributes {
  installed_kibana: KibanaAssetReference[];
  installed_es: EsAssetReference[];
  package_assets?: PackageAssetReference[];
  es_index_patterns: Record<string, string>;
  name: string;
  version: string;
  install_status: EpmPackageInstallStatus;
  install_version: string;
  install_started_at: string;
  install_source: InstallSource;
  installed_kibana_space_id?: string;
  keep_policies_up_to_date?: boolean;
}

export interface PackageUsageStats {
  agent_policy_count: number;
}

export type Installable<T> =
  | InstalledRegistry<T>
  | Installing<T>
  | NotInstalled<T>
  | InstallFailed<T>
  | InstalledBundled<T>;

export type InstalledRegistry<T = {}> = T & {
  status: InstallationStatus['Installed'];
  savedObject: SavedObject<Installation>;
};

export type InstalledBundled<T = {}> = T & {
  status: InstallationStatus['InstalledBundled'];
};

export type Installing<T = {}> = T & {
  status: InstallationStatus['Installing'];
  savedObject: SavedObject<Installation>;
};

export type NotInstalled<T = {}> = T & {
  status: InstallationStatus['NotInstalled'];
};

export type InstallFailed<T = {}> = T & {
  status: InstallationStatus['InstallFailed'];
};

export type AssetReference = KibanaAssetReference | EsAssetReference;

export type KibanaAssetReference = Pick<SavedObjectReference, 'id'> & {
  type: KibanaSavedObjectType;
};
export type EsAssetReference = Pick<SavedObjectReference, 'id'> & {
  type: ElasticsearchAssetType;
};

export type PackageAssetReference = Pick<SavedObjectReference, 'id'> & {
  type: typeof ASSETS_SAVED_OBJECT_TYPE;
};

export interface IndexTemplateMappings {
  properties: any;
}

// This is an index template v2, see https://github.com/elastic/elasticsearch/issues/53101
// until "proper" documentation of the new format is available.
// Fleet does not use nor support the legacy index template v1 format at all
export interface IndexTemplate {
  priority: number;
  index_patterns: string[];
  template: {
    settings: any;
    mappings: any;
  };
  data_stream: { hidden?: boolean };
  composed_of: string[];
  _meta: object;
}

export interface ESAssetMetadata {
  package?: {
    name: string;
  };
  managed_by: string;
  managed: boolean;
}
export interface TemplateMapEntry {
  _meta: ESAssetMetadata;
  template:
    | {
        mappings: NonNullable<RegistryElasticsearch['index_template.mappings']>;
      }
    | {
        settings: NonNullable<RegistryElasticsearch['index_template.settings']> | object;
      };
}

export type TemplateMap = Record<string, TemplateMapEntry>;
export interface IndexTemplateEntry {
  templateName: string;
  indexTemplate: IndexTemplate;
}
