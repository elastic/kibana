/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { dashboardServiceProvider } from './dashboard_service';
import { savedObjectsServiceMock } from '../../../../../../src/core/public/mocks';
import { SavedObjectDashboard } from '../../../../../../src/plugins/dashboard/public/saved_dashboards';

jest.mock('@elastic/eui', () => {
  return {
    htmlIdGenerator: jest.fn(() => {
      return jest.fn(() => 'test-panel-id');
    }),
  };
});

describe('DashboardService', () => {
  const mockSavedObjectClient = savedObjectsServiceMock.createStartContract().client;

  const dashboardService = dashboardServiceProvider(mockSavedObjectClient, '8.0.0');

  test('should fetch dashboard', () => {
    // act
    dashboardService.fetchDashboards('test');
    // assert
    expect(mockSavedObjectClient.find).toHaveBeenCalledWith({
      type: 'dashboard',
      perPage: 10,
      search: `test*`,
      searchFields: ['title^3', 'description'],
    });
  });

  test('should attach panel to the dashboard', () => {
    // act
    dashboardService.attachPanel(
      'test-dashboard',
      ({
        title: 'ML Test',
        hits: 0,
        description: '',
        panelsJSON:
          '[{"version":"8.0.0","type":"ml_anomaly_swimlane","gridData":{"x":0,"y":0,"w":24,"h":15,"i":"i63c960b1-ab1b-11ea-809d-f5c60c43347f"},"panelIndex":"i63c960b1-ab1b-11ea-809d-f5c60c43347f","embeddableConfig":{"title":"Panel test!","jobIds":["cw_multi_1"],"swimlaneType":"overall"},"title":"Panel test!"},{"version":"8.0.0","type":"ml_anomaly_swimlane","gridData":{"x":24,"y":0,"w":24,"h":15,"i":"0aa334bd-8308-4ded-9462-80dbd37680ee"},"panelIndex":"0aa334bd-8308-4ded-9462-80dbd37680ee","embeddableConfig":{"title":"ML anomaly swimlane for fb_population_1","jobIds":["fb_population_1"],"limit":5,"swimlaneType":"overall"},"title":"ML anomaly swimlane for fb_population_1"},{"version":"8.0.0","gridData":{"x":0,"y":15,"w":24,"h":15,"i":"abd36eb7-4774-4216-891e-12100752b46d"},"panelIndex":"abd36eb7-4774-4216-891e-12100752b46d","embeddableConfig":{},"panelRefName":"panel_2"}]',
        optionsJSON: '{"hidePanelTitles":false,"useMargins":true}',
        version: 1,
        timeRestore: false,
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{"query":{"language":"kuery","query":""},"filter":[]}',
        },
      } as unknown) as SavedObjectDashboard,
      { title: 'Test title', type: 'test-panel', embeddableConfig: { testConfig: '' } }
    );
    // assert
    expect(mockSavedObjectClient.update).toHaveBeenCalledWith('dashboard', 'test-dashboard', {
      title: 'ML Test',
      hits: 0,
      description: '',
      panelsJSON:
        '[{"version":"8.0.0","type":"ml_anomaly_swimlane","gridData":{"x":0,"y":0,"w":24,"h":15,"i":"i63c960b1-ab1b-11ea-809d-f5c60c43347f"},"panelIndex":"i63c960b1-ab1b-11ea-809d-f5c60c43347f","embeddableConfig":{"title":"Panel test!","jobIds":["cw_multi_1"],"swimlaneType":"overall"},"title":"Panel test!"},{"version":"8.0.0","type":"ml_anomaly_swimlane","gridData":{"x":24,"y":0,"w":24,"h":15,"i":"0aa334bd-8308-4ded-9462-80dbd37680ee"},"panelIndex":"0aa334bd-8308-4ded-9462-80dbd37680ee","embeddableConfig":{"title":"ML anomaly swimlane for fb_population_1","jobIds":["fb_population_1"],"limit":5,"swimlaneType":"overall"},"title":"ML anomaly swimlane for fb_population_1"},{"version":"8.0.0","gridData":{"x":0,"y":15,"w":24,"h":15,"i":"abd36eb7-4774-4216-891e-12100752b46d"},"panelIndex":"abd36eb7-4774-4216-891e-12100752b46d","embeddableConfig":{},"panelRefName":"panel_2"},{"panelIndex":"test-panel-id","embeddableConfig":{"testConfig":""},"title":"Test title","type":"test-panel","version":"8.0.0","gridData":{"h":15,"i":"test-panel-id","w":24,"x":0,"y":30}}]',
      optionsJSON: '{"hidePanelTitles":false,"useMargins":true}',
      version: 1,
      timeRestore: false,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"language":"kuery","query":""},"filter":[]}',
      },
    });
  });
});
