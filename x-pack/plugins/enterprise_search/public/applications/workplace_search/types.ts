/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleMapping } from '../shared/types';

export * from '../../../common/types/workplace_search';

export type SpacerSizeTypes = 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl';

export interface MetaPage {
  current: number;
  size: number;
  total_pages: number;
  total_results: number;
}

export interface Meta {
  page: MetaPage;
}

export type Role = 'admin' | 'user';

export interface Group {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  contentSources: ContentSource[];
  users: User[];
  usersCount: number;
  color?: string;
}

export interface GroupDetails extends Group {
  contentSources: ContentSourceDetails[];
  canEditGroup: boolean;
  canDeleteGroup: boolean;
}

export interface User {
  id: string;
  name: string | null;
  initials: string;
  pictureUrl: string | null;
  color: string;
  email: string;
  role?: string;
  groupIds: string[];
}

export interface Features {
  basicOrgContext?: FeatureIds[];
  basicOrgContextExcludedFeatures?: FeatureIds[];
  platinumOrgContext?: FeatureIds[];
  platinumPrivateContext: FeatureIds[];
}

export interface Configuration {
  isPublicKey: boolean;
  needsBaseUrl: boolean;
  needsSubdomain?: boolean;
  needsConfiguration?: boolean;
  hasOauthRedirect: boolean;
  baseUrlTitle?: string;
  documentationUrl: string;
  applicationPortalUrl?: string;
  applicationLinkTitle?: string;
  githubRepository?: string;
}

export interface SourceDataItem {
  name: string;
  iconName: string;
  categories?: string[];
  serviceType: string;
  configuration: Configuration;
  configured?: boolean;
  connected?: boolean;
  features?: Features;
  objTypes?: string[];
  accountContextOnly: boolean;
  internalConnectorAvailable?: boolean;
  externalConnectorAvailable?: boolean;
  customConnectorAvailable?: boolean;
  isBeta?: boolean;
}

export interface ContentSource {
  id: string;
  serviceType: string;
  baseServiceType?: string;
  name: string;
}

export interface SourceContentItem {
  id: string;
  last_updated: string;
  [key: string]: string | CustomAPIFieldValue;
}

export interface ContentSourceDetails extends ContentSource {
  status: string;
  statusMessage: string;
  documentCount: string;
  isFederatedSource: boolean;
  searchable: boolean;
  supportedByLicense: boolean;
  errorReason: string | null;
  allowsReauth: boolean;
  boost: number;
  activities: SourceActivity[];
  isOauth1: boolean;
  altIcon?: string; // base64 encoded png
  mainIcon?: string; // base64 encoded png
}

interface DescriptionList {
  title: string;
  description: string;
}

export interface DocumentSummaryItem {
  count: number;
  type: string;
}

interface SourceActivity {
  details: string[];
  event: string;
  time: string;
  status: string;
}

export interface SyncEstimate {
  duration?: string;
  nextStart?: string;
  lastRun?: string;
}

interface SyncIndexItem<T> {
  full: T;
  incremental: T;
  delete: T;
  permissions?: T;
}

export interface IndexingSchedule extends SyncIndexItem<string> {
  estimates: SyncIndexItem<SyncEstimate>;
  blockedWindows?: BlockedWindow[];
}

export type TimeUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';

export type SyncJobType = 'full' | 'incremental' | 'delete' | 'permissions';

export const DAYS_OF_WEEK_VALUES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;
export type DayOfWeek = typeof DAYS_OF_WEEK_VALUES[number];

export interface BlockedWindow {
  jobType: SyncJobType;
  day: DayOfWeek | 'all';
  start: string;
  end: string;
}

export interface IndexingRuleExclude {
  filterType: 'object_type' | 'path_template' | 'file_extension';
  exclude: string;
}

export interface IndexingRuleInclude {
  filterType: 'object_type' | 'path_template' | 'file_extension';
  include: string;
}

export type IndexingRule = IndexingRuleInclude | IndexingRuleExclude;

export interface IndexingConfig {
  enabled: boolean;
  features: {
    contentExtraction: {
      enabled: boolean;
    };
    thumbnails: {
      enabled: boolean;
    };
  };
  rules: IndexingRule[];
  schedule: IndexingSchedule;
}

interface AppSecret {
  app_id: string;
  fingerprint: string;
  base_url?: string;
}

export interface ContentSourceFullData extends ContentSourceDetails {
  activities: SourceActivity[];
  details: DescriptionList[];
  summary: DocumentSummaryItem[];
  groups: Group[];
  indexing: IndexingConfig;
  custom: boolean;
  isIndexedSource: boolean;
  isSyncConfigEnabled: boolean;
  areThumbnailsConfigEnabled: boolean;
  accessToken: string;
  urlField: string;
  titleField: string;
  licenseSupportsPermissions: boolean;
  serviceTypeSupportsPermissions: boolean;
  indexPermissions: boolean;
  hasPermissions: boolean;
  urlFieldIsLinkable: boolean;
  createdAt: string;
  serviceName: string;
  secret?: AppSecret; // undefined for all content sources except GitHub apps
}

export interface ContentSourceStatus {
  id: string;
  name: string;
  service_type: string;
  status: {
    status: string;
    synced_at: string;
    error_reason: number;
  };
}

export interface Connector {
  serviceType: string;
  name: string;
  configured: boolean;
  supportedByLicense: boolean;
  accountContextOnly: boolean;
}

export interface SourcePriority {
  [id: string]: number;
}

export enum FeatureIds {
  SyncFrequency = 'SyncFrequency',
  SyncedItems = 'SyncedItems',
  SearchableContent = 'SearchableContent',
  Remote = 'Remote',
  Private = 'Private',
  GlobalAccessPermissions = 'GlobalAccessPermissions',
  DocumentLevelPermissions = 'DocumentLevelPermissions',
}

export interface CustomSource {
  accessToken: string;
  name: string;
  id: string;
}

// https://www.elastic.co/guide/en/workplace-search/current/workplace-search-custom-sources-api.html#_schema_data_types
type CustomAPIString = string | string[];
type CustomAPINumber = number | number[];
type CustomAPIDate = string | string[];
type CustomAPIGeolocation = string | string[] | number[] | number[][];

export type CustomAPIFieldValue =
  | CustomAPIString
  | CustomAPINumber
  | CustomAPIDate
  | CustomAPIGeolocation;

export interface Result {
  content_source_id: string;
  last_updated: string;
  id: string;
  updated_at: string;
  source: string;
  [key: string]: CustomAPIFieldValue;
}

export interface OptionValue {
  value: string;
  text: string;
}

export interface DetailField {
  fieldName: string;
  label: string;
}

export interface SearchResultConfig {
  titleField: string | null;
  subtitleField: string | null;
  descriptionField: string | null;
  typeField: string | null;
  mediaTypeField: string | null;
  createdByField: string | null;
  updatedByField: string | null;
  urlField: string | null;
  color: string;
  detailFields: DetailField[];
}

export interface RoleGroup {
  id: string;
  name: string;
}

export interface WSRoleMapping extends RoleMapping {
  allGroups: boolean;
  groups: RoleGroup[];
}

export interface ApiToken {
  key?: string;
  id?: string;
  name: string;
}
