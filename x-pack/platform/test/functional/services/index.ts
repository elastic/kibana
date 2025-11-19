/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as kibanaApiIntegrationServices } from '@kbn/test-suites-src/api_integration/services';
import { services as kibanaFunctionalServices } from '@kbn/test-suites-src/functional/services';
import { services as kibanaXPackApiIntegrationServices } from '../../api_integration/services';
import { ReportingFunctionalProvider } from '../../reporting_functional/services';
import { AceEditorProvider } from './ace_editor';
import { ActionsServiceProvider } from './actions';
import { AiopsProvider } from './aiops';
import { CanvasElementProvider } from './canvas_element';
import { CasesServiceProvider } from './cases';
import { DataStreamProvider } from './data_stream';
import { GrokDebuggerProvider } from './grok_debugger';
import { MachineLearningProvider } from './ml';
import { PipelineEditorProvider } from './pipeline_editor';
import { PipelineListProvider } from './pipeline_list';
import { RandomProvider } from './random';
import { RulesServiceProvider } from './rules';
import { SampleDataServiceProvider } from './sample_data';
import { TransformProvider } from './transform';
import { UserMenuProvider } from './user_menu';

import {
  MonitoringAlertsProvider,
  MonitoringBeatDetailProvider,
  MonitoringBeatsListingProvider,
  MonitoringBeatsOverviewProvider,
  MonitoringBeatsSummaryStatusProvider,
  MonitoringClusterAlertsProvider,
  MonitoringClusterListProvider,
  MonitoringClusterOverviewProvider,
  MonitoringElasticsearchIndexDetailProvider,
  MonitoringElasticsearchIndicesProvider,
  MonitoringElasticsearchNodeDetailProvider,
  MonitoringElasticsearchNodesProvider,
  MonitoringElasticsearchOverviewProvider,
  MonitoringElasticsearchShardsProvider,
  MonitoringElasticsearchSummaryStatusProvider,
  MonitoringEnterpriseSearchOverviewProvider,
  MonitoringEnterpriseSearchSummaryStatusProvider,
  MonitoringKibanaInstanceProvider,
  MonitoringKibanaInstancesProvider,
  MonitoringKibanaOverviewProvider,
  MonitoringKibanaSummaryStatusProvider,
  MonitoringLogstashNodeDetailProvider,
  MonitoringLogstashNodesProvider,
  MonitoringLogstashOverviewProvider,
  MonitoringLogstashPipelinesProvider,
  MonitoringLogstashPipelineViewerProvider,
  MonitoringLogstashSummaryStatusProvider,
  MonitoringNoDataProvider,
  MonitoringSetupModeProvider,
  // @ts-ignore not ts yet
} from './monitoring';

// define the name and providers for services that should be
// available to your tests. If you don't specify anything here
// only the built-in services will be available
export const services = {
  ...kibanaFunctionalServices,
  actions: ActionsServiceProvider,
  aiops: AiopsProvider,
  canvasElement: CanvasElementProvider,
  cases: CasesServiceProvider,
  supertest: kibanaApiIntegrationServices.supertest,
  supertestWithoutAuth: kibanaXPackApiIntegrationServices.supertestWithoutAuth,
  esSupertest: kibanaApiIntegrationServices.esSupertest,
  dataViewApi: kibanaXPackApiIntegrationServices.dataViewApi,
  spaces: kibanaXPackApiIntegrationServices.spaces,
  userMenu: UserMenuProvider,
  aceEditor: AceEditorProvider,
  rules: RulesServiceProvider,
  sampleData: SampleDataServiceProvider,
  grokDebugger: GrokDebuggerProvider,
  ml: MachineLearningProvider,
  transform: TransformProvider,
  reporting: ReportingFunctionalProvider,
  random: RandomProvider,
  pipelineList: PipelineListProvider,
  pipelineEditor: PipelineEditorProvider,
  dataStreams: DataStreamProvider,
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
};
