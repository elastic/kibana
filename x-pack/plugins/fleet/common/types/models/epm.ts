/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type {
  ASSETS_SAVED_OBJECT_TYPE,
  agentAssetTypes,
  dataTypes,
  monitoringTypes,
  installationStatuses,
} from '../../constants';
import type { ValueOf } from '..';

import type { PackageSpecManifest, PackageSpecIcon, PackageSpecCategory } from './package_spec';

export type InstallationStatus = typeof installationStatuses;

export enum InstallStatus {
  installed = 'installed',
  notInstalled = 'not_installed',
  installing = 'installing',
  reinstalling = 'reinstalling',
  uninstalling = 'uninstalling',
}

export interface DefaultPackagesInstallationError {
  installType: InstallType;
  error: Error;
}

export type InstallType = 'reinstall' | 'reupdate' | 'rollback' | 'update' | 'install' | 'unknown';
export type InstallSource = 'registry' | 'upload' | 'bundled' | 'custom';

export type EpmPackageInstallStatus = 'installed' | 'installing' | 'install_failed';

export type ServiceName = 'kibana' | 'elasticsearch';
export type AgentAssetType = typeof agentAssetTypes;
export type DocAssetType = 'doc' | 'notice' | 'license';
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
  osqueryPackAsset = 'osquery_pack_asset',
  osquerySavedQuery = 'osquery_saved_query',
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
  osqueryPackAsset = 'osquery-pack-asset',
  osquerySavedQuery = 'osquery-saved-query',
}

export enum ElasticsearchAssetType {
  index = 'index',
  componentTemplate = 'component_template',
  ingestPipeline = 'ingest_pipeline',
  indexTemplate = 'index_template',
  ilmPolicy = 'ilm_policy',
  transform = 'transform',
  dataStreamIlmPolicy = 'data_stream_ilm_policy',
  mlModel = 'ml_model',
}
export type FleetElasticsearchAssetType = Exclude<
  ElasticsearchAssetType,
  ElasticsearchAssetType.index
>;

export type AllowedAssetTypes = [
  KibanaAssetType.dashboard,
  KibanaAssetType.search,
  KibanaAssetType.visualization,
  ElasticsearchAssetType.transform
];

// Defined as part of the removing public references to saved object schemas
export interface SimpleSOAssetType {
  id: string;
  type: ElasticsearchAssetType | KibanaSavedObjectType;
  updatedAt?: string;
  attributes: {
    title?: string;
    description?: string;
  };
}

export interface AssetSOObject {
  id: string;
  type: ElasticsearchAssetType | KibanaSavedObjectType;
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
  signature_path?: string;
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

export type RegistryRelease = NonNullable<PackageSpecManifest['release']>;
export interface RegistryImage extends PackageSpecIcon {
  path: string;
}

export enum RegistryPolicyTemplateKeys {
  categories = 'categories',
  data_streams = 'data_streams',
  inputs = 'inputs',
  readme = 'readme',
  multiple = 'multiple',
  type = 'type',
  vars = 'vars',
  input = 'input',
  template_path = 'template_path',
  name = 'name',
  title = 'title',
  description = 'description',
  icons = 'icons',
  screenshots = 'screenshots',
}
interface BaseTemplate {
  [RegistryPolicyTemplateKeys.name]: string;
  [RegistryPolicyTemplateKeys.title]: string;
  [RegistryPolicyTemplateKeys.description]: string;
  [RegistryPolicyTemplateKeys.icons]?: RegistryImage[];
  [RegistryPolicyTemplateKeys.screenshots]?: RegistryImage[];
  [RegistryPolicyTemplateKeys.multiple]?: boolean;
}
export interface RegistryPolicyIntegrationTemplate extends BaseTemplate {
  [RegistryPolicyTemplateKeys.categories]?: Array<PackageSpecCategory | undefined>;
  [RegistryPolicyTemplateKeys.data_streams]?: string[];
  [RegistryPolicyTemplateKeys.inputs]?: RegistryInput[];
  [RegistryPolicyTemplateKeys.readme]?: string;
}

export interface RegistryPolicyInputOnlyTemplate extends BaseTemplate {
  [RegistryPolicyTemplateKeys.type]: string;
  [RegistryPolicyTemplateKeys.input]: string;
  [RegistryPolicyTemplateKeys.template_path]: string;
  [RegistryPolicyTemplateKeys.vars]?: RegistryVarsEntry[];
}

export type RegistryPolicyTemplate =
  | RegistryPolicyIntegrationTemplate
  | RegistryPolicyInputOnlyTemplate;

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

export type RegistryStreamWithDataStream = RegistryStream & { data_stream: RegistryDataStream };

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

// from /categories
// https://github.com/elastic/package-registry/blob/master/docs/api/categories.json
export type CategorySummaryList = CategorySummaryItem[];
export type CategoryId = string;
export interface CategorySummaryItem {
  id: CategoryId;
  title: string;
  count: number;
  parent_id?: string;
  parent_title?: string;
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
  FleetElasticsearchAssetType,
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
  routing_rules = 'routing_rules',
  lifecycle = 'lifecycle',
}

export interface RegistryDataStream {
  [key: string]: any;
  [RegistryDataStreamKeys.type]: string;
  [RegistryDataStreamKeys.ilm_policy]?: string;
  [RegistryDataStreamKeys.hidden]?: boolean;
  [RegistryDataStreamKeys.dataset]: string;
  [RegistryDataStreamKeys.title]: string;
  [RegistryDataStreamKeys.release]: RegistryRelease;
  [RegistryDataStreamKeys.streams]?: RegistryStream[];
  [RegistryDataStreamKeys.package]: string;
  [RegistryDataStreamKeys.path]: string;
  [RegistryDataStreamKeys.ingest_pipeline]?: string;
  [RegistryDataStreamKeys.elasticsearch]?: RegistryElasticsearch;
  [RegistryDataStreamKeys.dataset_is_prefix]?: boolean;
  [RegistryDataStreamKeys.routing_rules]?: RegistryDataStreamRoutingRules[];
  [RegistryDataStreamKeys.lifecycle]?: RegistryDataStreamLifecycle;
}

export interface RegistryElasticsearch {
  privileges?: RegistryDataStreamPrivileges;
  'index_template.settings'?: estypes.IndicesIndexSettings;
  'index_template.mappings'?: estypes.MappingTypeMapping;
  'index_template.data_stream'?: RegistryDataStreamProperties;
  'ingest_pipeline.name'?: string;
  source_mode?: 'default' | 'synthetic';
  index_mode?: 'time_series';
  dynamic_dataset?: boolean;
  dynamic_namespace?: boolean;
}

export interface RegistryDataStreamProperties {
  hidden?: boolean;
}

export interface RegistryDataStreamPrivileges {
  cluster?: string[];
  indices?: string[];
}

export interface RegistryDataStreamRoutingRules {
  source_dataset: string;
  rules: Array<{
    target_dataset: string;
    if: string;
    namespace?: string;
  }>;
}

export interface RegistryDataStreamLifecycle {
  data_retention: string;
}

export type RegistryVarType =
  | 'integer'
  | 'bool'
  | 'password'
  | 'select'
  | 'text'
  | 'yaml'
  | 'string'
  | 'textarea';
export enum RegistryVarsEntryKeys {
  name = 'name',
  title = 'title',
  description = 'description',
  type = 'type',
  required = 'required',
  show_user = 'show_user',
  multi = 'multi',
  options = 'options',
  default = 'default',
  os = 'os',
  secret = 'secret',
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
  [RegistryVarsEntryKeys.secret]?: boolean;
  [RegistryVarsEntryKeys.show_user]?: boolean;
  [RegistryVarsEntryKeys.multi]?: boolean;
  [RegistryVarsEntryKeys.options]?: Array<{ value: string; text: string }>;
  [RegistryVarsEntryKeys.default]?: string | string[] | boolean;
  [RegistryVarsEntryKeys.os]?: {
    [key: string]: {
      default: string | string[];
    };
  };
}

// Deprecated as part of the removing public references to saved object schemas
// See https://github.com/elastic/kibana/issues/149098
/**
 * @deprecated replaced with installationInfo
 */
export interface InstallableSavedObject {
  type: string;
  id: string;
  attributes: Installation;
  references?: SOReference[];
  created_at?: string;
  updated_at?: string;
  version?: string;
  coreMigrationVersion?: string;
  namespaces?: string[];
}
export type InstallationInfo = {
  type: string;
  created_at?: string;
  updated_at?: string;
  namespaces?: string[];
} & Omit<
  Installation,
  | 'package_assets'
  | 'es_index_patterns'
  | 'install_version'
  | 'install_started_at'
  | 'keep_policies_up_to_date'
  | 'internal'
  | 'removable'
>;

// Deprecated as part of the removing public references to saved object schemas
// See https://github.com/elastic/kibana/issues/149098
/**
 * @deprecated
 */
interface SOReference {
  name: string;
  type: string;
  id: string;
}

// some properties are optional in Registry responses but required in EPM
// internal until we need them
export interface EpmPackageAdditions {
  title: string;
  latestVersion: string;
  assets: AssetsGroupedByServiceByType;
  notice?: string;
  licensePath?: string;
  keepPoliciesUpToDate?: boolean;
}

type Merge<FirstType, SecondType> = Omit<FirstType, Extract<keyof FirstType, keyof SecondType>> &
  SecondType;

// Managers public HTTP response types
export type PackageList = PackageListItem[];

// Remove savedObject when addressing the deprecation
export type PackageListItem = Installable<RegistrySearchResult> & {
  id: string;
  integration?: string;
  installationInfo?: InstallationInfo;
  savedObject?: InstallableSavedObject;
};
export type PackagesGroupedByStatus = Record<ValueOf<InstallationStatus>, PackageList>;
export type PackageInfo =
  | Installable<Merge<RegistryPackage, EpmPackageAdditions>>
  | Installable<Merge<ArchivePackage, EpmPackageAdditions>>;

export type IntegrationCardReleaseLabel = 'beta' | 'preview' | 'ga' | 'rc';

export type PackageVerificationStatus = 'verified' | 'unverified' | 'unknown';

// TODO - Expand this with other experimental indexing types
export type ExperimentalIndexingFeature =
  | 'synthetic_source'
  | 'tsdb'
  | 'doc_value_only_numeric'
  | 'doc_value_only_other';

export interface ExperimentalDataStreamFeature {
  data_stream: string;
  features: Partial<Record<ExperimentalIndexingFeature, boolean>>;
}

export interface Installation {
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
  install_format_schema_version?: string;
  verification_status: PackageVerificationStatus;
  verification_key_id?: string | null;
  experimental_data_stream_features?: ExperimentalDataStreamFeature[];
  internal?: boolean;
  removable?: boolean;
}

export interface PackageUsageStats {
  agent_policy_count: number;
}

export type Installable<T> =
  | InstallStatusExcluded<T>
  | InstalledRegistry<T>
  | Installing<T>
  | NotInstalled<T>
  | InstallFailed<T>;

export type InstallStatusExcluded<T = {}> = T & {
  status: undefined;
};

export type InstalledRegistry<T = {}> = T & {
  status: InstallationStatus['Installed'];
  savedObject?: InstallableSavedObject;
  installationInfo?: InstallationInfo;
};

export type Installing<T = {}> = T & {
  status: InstallationStatus['Installing'];
  savedObject?: InstallableSavedObject;
  installationInfo?: InstallationInfo;
};

export type NotInstalled<T = {}> = T & {
  status: InstallationStatus['NotInstalled'];
};

export type InstallFailed<T = {}> = T & {
  status: InstallationStatus['InstallFailed'];
};

export type AssetReference = KibanaAssetReference | EsAssetReference;

export interface KibanaAssetReference {
  id: string;
  type: KibanaSavedObjectType;
}
export interface EsAssetReference {
  id: string;
  type: ElasticsearchAssetType;
  deferred?: boolean;
}

export interface PackageAssetReference {
  id: string;
  type: typeof ASSETS_SAVED_OBJECT_TYPE;
}

export interface IndexTemplateMappings {
  properties: any;
  dynamic_templates?: any;
  runtime?: any;
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
    lifecycle?: any;
  };
  data_stream: { hidden?: boolean };
  composed_of: string[];
  ignore_missing_component_templates?: string[];
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
        settings: NonNullable<RegistryElasticsearch['index_template.settings']>;
      }
    | {
        lifecycle?: any;
      };
}

export type TemplateMap = Record<string, TemplateMapEntry>;
export interface IndexTemplateEntry {
  templateName: string;
  indexTemplate: IndexTemplate;
}
