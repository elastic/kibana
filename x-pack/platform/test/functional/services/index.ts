/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as kibanaFunctionalServices } from '@kbn/test-suites-src/functional/services';
import { services as kibanaApiIntegrationServices } from '@kbn/test-suites-src/api_integration/services';
import {
  MonitoringNoDataProvider,
  MonitoringClusterListProvider,
  MonitoringClusterOverviewProvider,
  MonitoringClusterAlertsProvider,
  MonitoringElasticsearchSummaryStatusProvider,
  MonitoringElasticsearchOverviewProvider,
  MonitoringElasticsearchNodesProvider,
  MonitoringElasticsearchNodeDetailProvider,
  MonitoringElasticsearchIndicesProvider,
  MonitoringElasticsearchIndexDetailProvider,
  MonitoringElasticsearchShardsProvider,
  MonitoringBeatsOverviewProvider,
  MonitoringBeatsListingProvider,
  MonitoringBeatDetailProvider,
  MonitoringBeatsSummaryStatusProvider,
  MonitoringLogstashOverviewProvider,
  MonitoringLogstashNodesProvider,
  MonitoringLogstashNodeDetailProvider,
  MonitoringLogstashPipelinesProvider,
  MonitoringLogstashPipelineViewerProvider,
  MonitoringLogstashSummaryStatusProvider,
  MonitoringKibanaOverviewProvider,
  MonitoringKibanaInstancesProvider,
  MonitoringKibanaInstanceProvider,
  MonitoringKibanaSummaryStatusProvider,
  MonitoringSetupModeProvider,
  MonitoringAlertsProvider,
  MonitoringEnterpriseSearchOverviewProvider,
  MonitoringEnterpriseSearchSummaryStatusProvider,
  // @ts-ignore not ts yet
} from './monitoring';
import { services as kibanaXPackApiIntegrationServices } from '../../api_integration/services';
import { UserMenuProvider } from './user_menu';
import { AceEditorProvider } from './ace_editor';
import { SampleDataServiceProvider } from './sample_data';
import { GrokDebuggerProvider } from './grok_debugger';
import { MachineLearningProvider } from './ml';
import { TransformProvider } from './transform';
import { ObservabilityProvider } from './observability';
import { CasesServiceProvider } from './cases';
import { ActionsServiceProvider } from './actions';
import { RulesServiceProvider } from './rules';
import { AiopsProvider } from './aiops';
import { SearchSessionsService } from './search_sessions';
import { CanvasElementProvider } from './canvas_element';

// define the name and providers for services that should be
// available to your tests. If you don't specify anything here
// only the built-in services will be available
export const services = {
  ...kibanaFunctionalServices,
  supertest: kibanaApiIntegrationServices.supertest,
  supertestWithoutAuth: kibanaXPackApiIntegrationServices.supertestWithoutAuth,
  esSupertest: kibanaApiIntegrationServices.esSupertest,
  dataViewApi: kibanaXPackApiIntegrationServices.dataViewApi,
  spaces: kibanaXPackApiIntegrationServices.spaces,
  monitoringNoData: MonitoringNoDataProvider,
  monitoringClusterList: MonitoringClusterListProvider,
  monitoringClusterOverview: MonitoringClusterOverviewProvider,
  monitoringClusterAlerts: MonitoringClusterAlertsProvider,
  monitoringElasticsearchSummaryStatus: MonitoringElasticsearchSummaryStatusProvider,
  monitoringElasticsearchOverview: MonitoringElasticsearchOverviewProvider,
  monitoringElasticsearchNodes: MonitoringElasticsearchNodesProvider,
  monitoringElasticsearchNodeDetail: MonitoringElasticsearchNodeDetailProvider,
  monitoringElasticsearchIndices: MonitoringElasticsearchIndicesProvider,
  monitoringElasticsearchIndexDetail: MonitoringElasticsearchIndexDetailProvider,
  monitoringElasticsearchShards: MonitoringElasticsearchShardsProvider,
  monitoringBeatsOverview: MonitoringBeatsOverviewProvider,
  monitoringBeatsListing: MonitoringBeatsListingProvider,
  monitoringBeatDetail: MonitoringBeatDetailProvider,
  monitoringBeatsSummaryStatus: MonitoringBeatsSummaryStatusProvider,
  monitoringLogstashOverview: MonitoringLogstashOverviewProvider,
  monitoringLogstashNodes: MonitoringLogstashNodesProvider,
  monitoringLogstashNodeDetail: MonitoringLogstashNodeDetailProvider,
  monitoringLogstashPipelines: MonitoringLogstashPipelinesProvider,
  monitoringLogstashPipelineViewer: MonitoringLogstashPipelineViewerProvider,
  monitoringLogstashSummaryStatus: MonitoringLogstashSummaryStatusProvider,
  monitoringKibanaOverview: MonitoringKibanaOverviewProvider,
  monitoringKibanaInstances: MonitoringKibanaInstancesProvider,
  monitoringKibanaInstance: MonitoringKibanaInstanceProvider,
  monitoringKibanaSummaryStatus: MonitoringKibanaSummaryStatusProvider,
  monitoringEnterpriseSearchOverview: MonitoringEnterpriseSearchOverviewProvider,
  monitoringEnterpriseSearchSummaryStatus: MonitoringEnterpriseSearchSummaryStatusProvider,
  monitoringSetupMode: MonitoringSetupModeProvider,
  monitoringAlerts: MonitoringAlertsProvider,
  userMenu: UserMenuProvider,
  aceEditor: AceEditorProvider,
  sampleData: SampleDataServiceProvider,
  grokDebugger: GrokDebuggerProvider,
  ml: MachineLearningProvider,
  transform: TransformProvider,
  serchSessions: SearchSessionsService,
  observability: ObservabilityProvider,
  cases: CasesServiceProvider,
  actions: ActionsServiceProvider,
  rules: RulesServiceProvider,
  aiops: AiopsProvider,
  canvasElement: CanvasElementProvider,
};
