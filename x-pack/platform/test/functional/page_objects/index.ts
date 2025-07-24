/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as kibanaFunctionalPageObjects } from '@kbn/test-suites-src/functional/page_objects';
import { RoleMappingsPageProvider } from './role_mappings_page';
import { SecurityPageObject } from './security_page';
import { SpaceSelectorPageObject } from './space_selector_page';
import { CopySavedObjectsToSpacePageProvider } from './copy_saved_objects_to_space_page';
import { MonitoringPageObject } from './monitoring_page';
import { AccountSettingsPageObject } from './account_settings_page';
import { CanvasPageProvider } from './canvas_page';
import { LensPageProvider } from './lens_page';
import { GisPageObject } from './gis_page';
import { ReportingPageObject } from './reporting_page';
import { WatcherPageObject } from './watcher_page';
import { SearchProfilerPageProvider } from './search_profiler_page';
import { UpgradeAssistantFlyoutObject } from './upgrade_assistant_page';
import { UserProfilePageProvider } from './user_profile_page';
import { SnapshotRestorePageProvider } from './snapshot_restore_page';
import { SearchSessionsPageProvider } from './search_sessions_management_page';
import { GraphPageObject } from './graph_page';
import { MaintenanceWindowsPageProvider } from './maintenance_windows_page';
import { BannersPageObject } from './banners_page';
import { NavigationalSearchPageObject } from './navigational_search';
import { TagManagementPageObject } from './tag_management_page';
import { CrossClusterReplicationPageProvider } from './cross_cluster_replication_page';
import { GrokDebuggerPageObject } from './grok_debugger_page';
import { LicenseManagementPageProvider } from './license_management_page';
import { ApiKeysPageProvider } from './api_keys_page';
import { IndexManagementPageProvider } from './index_management_page';
import { ShareSavedObjectsToSpacePageProvider } from './share_saved_objects_to_space_page';
import { StatusPageObject } from './status_page';
import { GeoFileUploadPageObject } from './geo_file_upload';
import { IngestPipelinesPageProvider } from './ingest_pipelines_page';
import { LogstashPageObject } from './logstash_page';
import { IndexLifecycleManagementPageProvider } from './index_lifecycle_management_page';
import { RollupPageObject } from './rollup_page';
import { RemoteClustersPageProvider } from './remote_clusters_page';

// just like services, PageObjects are defined as a map of
// names to Providers. Merge in Kibana's or pick specific ones
export const pageObjects = {
  ...kibanaFunctionalPageObjects,
  roleMappings: RoleMappingsPageProvider,
  security: SecurityPageObject,
  spaceSelector: SpaceSelectorPageObject,
  copySavedObjectsToSpace: CopySavedObjectsToSpacePageProvider,
  monitoring: MonitoringPageObject,
  accountSetting: AccountSettingsPageObject,
  canvas: CanvasPageProvider,
  graph: GraphPageObject,
  lens: LensPageProvider,
  maps: GisPageObject,
  reporting: ReportingPageObject,
  watcher: WatcherPageObject,
  searchProfiler: SearchProfilerPageProvider,
  searchSessionsManagement: SearchSessionsPageProvider,
  snapshotRestore: SnapshotRestorePageProvider,
  upgradeAssistant: UpgradeAssistantFlyoutObject,
  userProfiles: UserProfilePageProvider,
  maintenanceWindows: MaintenanceWindowsPageProvider,
  banners: BannersPageObject,
  navigationalSearch: NavigationalSearchPageObject,
  tagManagement: TagManagementPageObject,
  crossClusterReplication: CrossClusterReplicationPageProvider,
  grokDebugger: GrokDebuggerPageObject,
  licenseManagement: LicenseManagementPageProvider,
  apiKeys: ApiKeysPageProvider,
  indexManagement: IndexManagementPageProvider,
  shareSavedObjectsToSpace: ShareSavedObjectsToSpacePageProvider,
  statusPage: StatusPageObject,
  geoFileUpload: GeoFileUploadPageObject,
  ingestPipelines: IngestPipelinesPageProvider,
  indexLifecycleManagement: IndexLifecycleManagementPageProvider,
  logstash: LogstashPageObject,
  rollup: RollupPageObject,
  remoteClusters: RemoteClustersPageProvider,
};
