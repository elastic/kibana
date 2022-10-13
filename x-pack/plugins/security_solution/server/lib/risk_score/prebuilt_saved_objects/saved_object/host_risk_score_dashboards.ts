/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/types';
import { RiskScoreFields } from '../../../../../common/search_strategy';

export const hostRiskScoreDashboards: SavedObject[] = [
  {
    attributes: {
      fieldAttrs: '{}',
      fields: '[]',
      runtimeFieldMap: '{}',
      timeFieldName: '@timestamp',
      title: 'ml_host_risk_score_<REPLACE-WITH-SPACE>',
    },
    coreMigrationVersion: '7.13.4',
    id: '<REPLACE-WITH-ID10>',
    migrationVersion: { 'index-pattern': '7.11.0' },
    references: [],
    type: 'index-pattern',
    updated_at: '2021-08-18T18:37:41.486Z',
  },
  {
    attributes: {
      description: null,
      state: {
        datasourceStates: {
          indexpattern: {
            layers: {
              'b885eaad-3c68-49ad-9891-70158d912dbd': {
                columnOrder: [
                  '8dcda7ec-1a1a-43b3-b0b8-e702943eed5c',
                  'e82aed80-ee04-4ad1-9b9d-fde4a25be58a',
                  'aa4ad9b2-8829-4517-aaa8-7ed7e5793e9b',
                ],
                columns: {
                  '8dcda7ec-1a1a-43b3-b0b8-e702943eed5c': {
                    customLabel: true,
                    dataType: 'string',
                    isBucketed: true,
                    label: 'Host Name',
                    operationType: 'terms',
                    params: {
                      missingBucket: false,
                      orderBy: { columnId: 'aa4ad9b2-8829-4517-aaa8-7ed7e5793e9b', type: 'column' },
                      orderDirection: 'desc',
                      otherBucket: true,
                      size: 20,
                    },
                    scale: 'ordinal',
                    sourceField: RiskScoreFields.hostName,
                  },
                  'aa4ad9b2-8829-4517-aaa8-7ed7e5793e9b': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Cumulative Risk Score',
                    operationType: 'max',
                    scale: 'ratio',
                    sourceField: RiskScoreFields.hostRiskScore,
                  },
                  'e82aed80-ee04-4ad1-9b9d-fde4a25be58a': {
                    dataType: 'date',
                    isBucketed: true,
                    label: '@timestamp',
                    operationType: 'date_histogram',
                    params: { interval: '1h' },
                    scale: 'interval',
                    sourceField: '@timestamp',
                  },
                },
                incompleteColumns: {},
              },
            },
          },
        },
        filters: [],
        query: { language: 'kuery', query: '' },
        visualization: {
          layers: [
            {
              accessors: ['aa4ad9b2-8829-4517-aaa8-7ed7e5793e9b'],
              layerId: 'b885eaad-3c68-49ad-9891-70158d912dbd',
              palette: { name: 'default', type: 'palette' },
              position: 'top',
              seriesType: 'bar_stacked',
              showGridlines: false,
              splitAccessor: '8dcda7ec-1a1a-43b3-b0b8-e702943eed5c',
              xAccessor: 'e82aed80-ee04-4ad1-9b9d-fde4a25be58a',
            },
          ],
          legend: { isVisible: true, position: 'right' },
          preferredSeriesType: 'bar_stacked',
          title: 'Empty XY chart',
          valueLabels: 'hide',
        },
      },
      title: 'Host Risk Score (Max Risk Score Histogram)',
      visualizationType: 'lnsXY',
    },
    coreMigrationVersion: '7.13.4',
    id: '<REPLACE-WITH-ID1>',
    migrationVersion: { lens: '7.13.1' },
    references: [
      {
        id: '<REPLACE-WITH-ID10>',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: '<REPLACE-WITH-ID10>',
        name: 'indexpattern-datasource-layer-b885eaad-3c68-49ad-9891-70158d912dbd',
        type: 'index-pattern',
      },
    ],
    type: 'lens',
    updated_at: '2021-08-18T18:48:30.689Z',
  },
  {
    attributes: {
      fieldAttrs: '{"signal.rule.type":{"count":1}}',
      fields: '[]',
      runtimeFieldMap: '{}',
      timeFieldName: '@timestamp',
      title: '.alerts-security.alerts-<REPLACE-WITH-SPACE>',
    },
    coreMigrationVersion: '7.13.4',
    id: '<REPLACE-WITH-ID11>',
    migrationVersion: { 'index-pattern': '7.11.0' },
    references: [],
    type: 'index-pattern',
    updated_at: '2021-08-18T16:27:39.980Z',
  },
  {
    attributes: {
      description: '',
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
      title: 'Host Risk Score (Rule Breakdown)',
      uiStateJSON: '{}',
      version: 1,
      visState:
        '{"title":"Host Risk Score (Rule Breakdown)","type":"table","aggs":[{"id":"2","enabled":true,"type":"sum","params":{"field":"signal.rule.risk_score","customLabel":"Total Risk Score"},"schema":"metric"},{"id":"1","enabled":true,"type":"count","params":{"customLabel":"Number of Hits"},"schema":"metric"},{"id":"3","enabled":true,"type":"terms","params":{"field":"host.name","orderBy":"2","order":"desc","size":20,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Host"},"schema":"split"},{"id":"4","enabled":true,"type":"terms","params":{"field":"signal.rule.name","orderBy":"2","order":"desc","size":20,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Rule Name"},"schema":"bucket"},{"id":"5","enabled":true,"type":"terms","params":{"field":"signal.rule.type","orderBy":"2","order":"desc","size":20,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Rule Type"},"schema":"bucket"}],"params":{"perPage":10,"showPartialRows":false,"showMetricsAtAllLevels":false,"showTotal":false,"showToolbar":false,"totalFunc":"sum","percentageCol":"","row":true}}',
    },
    coreMigrationVersion: '7.13.4',
    id: '<REPLACE-WITH-ID2>',
    migrationVersion: { visualization: '7.13.1' },
    references: [
      {
        id: '<REPLACE-WITH-ID11>',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
    type: 'visualization',
    updated_at: '2021-08-18T16:27:39.980Z',
  },
  {
    attributes: {
      description: '',
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"query":{"query":"not user.name: *$","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
      title: 'Associated Users (Rule Breakdown)',
      uiStateJSON: '{}',
      version: 1,
      visState:
        '{"title":"Associated Users (Rule Breakdown)","type":"table","aggs":[{"id":"2","enabled":true,"type":"sum","params":{"field":"signal.rule.risk_score","customLabel":"Total Risk Score"},"schema":"metric"},{"id":"1","enabled":true,"type":"count","params":{"customLabel":"Number of Hits"},"schema":"metric"},{"id":"3","enabled":true,"type":"terms","params":{"field":"user.name","orderBy":"2","order":"desc","size":20,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"User"},"schema":"split"},{"id":"4","enabled":true,"type":"terms","params":{"field":"signal.rule.name","orderBy":"2","order":"desc","size":20,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Rule Name"},"schema":"bucket"},{"id":"5","enabled":true,"type":"terms","params":{"field":"signal.rule.type","orderBy":"2","order":"desc","size":20,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Rule Type"},"schema":"bucket"}],"params":{"perPage":10,"showPartialRows":false,"showMetricsAtAllLevels":false,"showTotal":false,"showToolbar":false,"totalFunc":"sum","percentageCol":"","row":true}}',
    },
    coreMigrationVersion: '7.13.4',
    id: '<REPLACE-WITH-ID3>',
    migrationVersion: { visualization: '7.13.1' },
    references: [
      {
        id: '<REPLACE-WITH-ID11>',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
    type: 'visualization',
    updated_at: '2021-08-18T16:27:39.980Z',
  },
  {
    attributes: {
      description: '',
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
      title: 'Host Risk Score (Tactic Breakdown)- Verbose',
      uiStateJSON: '{}',
      version: 1,
      visState:
        '{"title":"Host Risk Score (Tactic Breakdown)- Verbose","type":"table","aggs":[{"id":"1","enabled":true,"type":"sum","params":{"field":"signal.rule.risk_score","customLabel":"Total Risk Score"},"schema":"metric"},{"id":"3","enabled":true,"type":"terms","params":{"field":"host.name","orderBy":"1","order":"desc","size":20,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Host"},"schema":"split"},{"id":"5","enabled":true,"type":"terms","params":{"field":"signal.rule.threat.tactic.name","orderBy":"1","order":"desc","size":50,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":true,"missingBucketLabel":"Other","customLabel":"Tactic"},"schema":"bucket"},{"id":"6","enabled":true,"type":"terms","params":{"field":"signal.rule.threat.technique.name","orderBy":"1","order":"desc","size":50,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":true,"missingBucketLabel":"Other","customLabel":"Technique"},"schema":"bucket"},{"id":"7","enabled":true,"type":"count","params":{"customLabel":"Number of Hits"},"schema":"metric"}],"params":{"perPage":10,"showPartialRows":false,"showMetricsAtAllLevels":false,"showTotal":false,"showToolbar":false,"totalFunc":"sum","percentageCol":"","row":true}}',
    },
    coreMigrationVersion: '7.13.4',
    id: '<REPLACE-WITH-ID4>',
    migrationVersion: { visualization: '7.13.1' },
    references: [
      {
        id: '<REPLACE-WITH-ID11>',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
    type: 'visualization',
    updated_at: '2021-08-18T16:27:39.980Z',
  },
  {
    attributes: { color: '#D36086', description: '', name: 'experimental' },
    coreMigrationVersion: '7.13.4',
    id: '<REPLACE-WITH-ID5>',
    references: [],
    type: 'tag',
    updated_at: '2021-08-18T16:27:39.980Z',
  },
  {
    attributes: {
      description:
        'This dashboard allows users to drill down further into the details of the risk components associated with a particular host.',
      hits: 0,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"language":"kuery","query":""},"filter":[]}',
      },
      optionsJSON: '{"hidePanelTitles":false,"useMargins":true}',
      panelsJSON:
        '[{"version":"7.13.4","type":"visualization","gridData":{"x":0,"y":0,"w":48,"h":3,"i":"eaa57cf4-7ca3-4919-ab76-dbac0eb6a195"},"panelIndex":"eaa57cf4-7ca3-4919-ab76-dbac0eb6a195","embeddableConfig":{"savedVis":{"title":"","description":"","type":"markdown","params":{"fontSize":12,"openLinksInNewTab":false,"markdown":"The Host Risk Score capability is an experimental feature released in 7.14. You can read further about it [here](https://github.com/elastic/detection-rules/blob/main/docs/experimental-machine-learning/host-risk-score.md)."},"uiState":{},"data":{"aggs":[],"searchSource":{"query":{"query":"","language":"kuery"},"filter":[]}}},"hidePanelTitles":true,"enhancements":{}}},{"version":"7.13.4","type":"lens","gridData":{"x":0,"y":3,"w":48,"h":15,"i":"e11ed08e-70d0-4c69-991a-12e20dc89440"},"panelIndex":"e11ed08e-70d0-4c69-991a-12e20dc89440","embeddableConfig":{"enhancements":{"dynamicActions":{"events":[{"eventId":"339da811-5c23-4432-9649-53cb066e6aaf","triggers":["VALUE_CLICK_TRIGGER"],"action":{"factoryId":"URL_DRILLDOWN","name":"Go to Host View","config":{"url":{"template":"{{kibanaUrl}}/app/security/hosts/{{context.panel.filters.[0].meta.params.query}}"},"openInNewTab":true,"encodeUrl":true}}}]}},"hidePanelTitles":false},"title":"Cumulative Host Risk Score (multiple hosts)","panelRefName":"panel_e11ed08e-70d0-4c69-991a-12e20dc89440"},{"version":"7.13.4","type":"visualization","gridData":{"x":0,"y":18,"w":24,"h":28,"i":"cae82aa1-20c8-4354-94ab-3934ac53b8fe"},"panelIndex":"cae82aa1-20c8-4354-94ab-3934ac53b8fe","embeddableConfig":{"enhancements":{"dynamicActions":{"events":[{"eventId":"0fd43778-bd5d-4b2b-85c3-47ac3b756434","triggers":["VALUE_CLICK_TRIGGER"],"action":{"factoryId":"URL_DRILLDOWN","name":"Go to Host View","config":{"url":{"template":"{{kibanaUrl}}/app/security/hosts/{{context.panel.filters.[0].meta.params.query}}"},"openInNewTab":true,"encodeUrl":true}}}]}},"hidePanelTitles":false},"title":"Associated Rules of Risky Hosts","panelRefName":"panel_cae82aa1-20c8-4354-94ab-3934ac53b8fe"},{"version":"7.13.4","type":"visualization","gridData":{"x":24,"y":18,"w":24,"h":28,"i":"8d09b97c-a023-4b7e-9e9d-1c46e726a487"},"panelIndex":"8d09b97c-a023-4b7e-9e9d-1c46e726a487","embeddableConfig":{"enhancements":{"dynamicActions":{"events":[{"eventId":"593ff0e6-25da-47ad-b81d-9a0106c0e9aa","triggers":["VALUE_CLICK_TRIGGER"],"action":{"factoryId":"URL_DRILLDOWN","name":"Go to Host View","config":{"url":{"template":"{{kibanaUrl}}/app/security/hosts/{{context.panel.filters.[0].meta.params.query}}"},"openInNewTab":true,"encodeUrl":true}}}]}},"hidePanelTitles":false},"title":"Associated Users of Risky Hosts","panelRefName":"panel_8d09b97c-a023-4b7e-9e9d-1c46e726a487"},{"version":"7.13.4","type":"visualization","gridData":{"x":0,"y":46,"w":48,"h":16,"i":"0c9c8318-ebb0-47fb-919a-1836ebf232ae"},"panelIndex":"0c9c8318-ebb0-47fb-919a-1836ebf232ae","embeddableConfig":{"enhancements":{"dynamicActions":{"events":[{"eventId":"a76ea63c-da92-4bad-b3d6-6df823e1c04b","triggers":["VALUE_CLICK_TRIGGER"],"action":{"factoryId":"URL_DRILLDOWN","name":"Go to Host View","config":{"url":{"template":"{{kibanaUrl}}/app/security/hosts/{{context.panel.filters.[0].meta.params.query}}"},"openInNewTab":true,"encodeUrl":true}}}]}},"hidePanelTitles":false},"title":"Tactic Breakdown of Risky Hosts (Verbose)","panelRefName":"panel_0c9c8318-ebb0-47fb-919a-1836ebf232ae"}]',
      timeRestore: false,
      title: 'Drilldown of Host Risk Score',
      version: 1,
    },
    coreMigrationVersion: '7.13.4',
    id: '<REPLACE-WITH-ID6>',
    migrationVersion: { dashboard: '7.13.1' },
    references: [
      {
        id: '<REPLACE-WITH-ID1>',
        name: 'e11ed08e-70d0-4c69-991a-12e20dc89440:panel_e11ed08e-70d0-4c69-991a-12e20dc89440',
        type: 'lens',
      },
      {
        id: '<REPLACE-WITH-ID2>',
        name: 'cae82aa1-20c8-4354-94ab-3934ac53b8fe:panel_cae82aa1-20c8-4354-94ab-3934ac53b8fe',
        type: 'visualization',
      },
      {
        id: '<REPLACE-WITH-ID3>',
        name: '8d09b97c-a023-4b7e-9e9d-1c46e726a487:panel_8d09b97c-a023-4b7e-9e9d-1c46e726a487',
        type: 'visualization',
      },
      {
        id: '<REPLACE-WITH-ID4>',
        name: '0c9c8318-ebb0-47fb-919a-1836ebf232ae:panel_0c9c8318-ebb0-47fb-919a-1836ebf232ae',
        type: 'visualization',
      },
      {
        id: '<REPLACE-WITH-ID5>',
        name: 'tag-1d00ebe0-f3b2-11eb-beb2-b91666445a94',
        type: 'tag',
      },
    ],
    type: 'dashboard',
    updated_at: '2021-08-18T17:09:15.576Z',
  },
  {
    attributes: {
      fieldAttrs: '{}',
      fields: '[]',
      runtimeFieldMap: '{}',
      timeFieldName: '@timestamp',
      title: 'ml_host_risk_score_latest_<REPLACE-WITH-SPACE>',
    },
    coreMigrationVersion: '7.13.4',
    id: '<REPLACE-WITH-ID9>',
    migrationVersion: { 'index-pattern': '7.11.0' },
    references: [],
    type: 'index-pattern',
    updated_at: '2021-08-18T18:47:22.500Z',
  },
  {
    attributes: {
      description: null,
      state: {
        datasourceStates: {
          indexpattern: {
            layers: {
              '2f34d626-d0ee-4ade-9e75-13c480699485': {
                columnOrder: [
                  '9c8c581f-6cb8-4ecf-8eb3-4c6df33edc5d',
                  'c547501b-fe04-4073-8b4e-dbbdc3a4ff04',
                  'e2444d64-721a-4532-9633-5b206eee76d6',
                ],
                columns: {
                  '9c8c581f-6cb8-4ecf-8eb3-4c6df33edc5d': {
                    customLabel: true,
                    dataType: 'string',
                    isBucketed: true,
                    label: 'Host Name',
                    operationType: 'terms',
                    params: {
                      missingBucket: false,
                      orderBy: { columnId: 'c547501b-fe04-4073-8b4e-dbbdc3a4ff04', type: 'column' },
                      orderDirection: 'desc',
                      otherBucket: true,
                      size: 20,
                    },
                    scale: 'ordinal',
                    sourceField: RiskScoreFields.hostName,
                  },
                  'c547501b-fe04-4073-8b4e-dbbdc3a4ff04': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Risk Score',
                    operationType: 'sum',
                    scale: 'ratio',
                    sourceField: RiskScoreFields.hostRiskScore,
                  },
                  'e2444d64-721a-4532-9633-5b206eee76d6': {
                    customLabel: true,
                    dataType: 'string',
                    isBucketed: false,
                    label: 'Current Risk',
                    operationType: 'last_value',
                    params: { sortField: '@timestamp' },
                    scale: 'ordinal',
                    sourceField: RiskScoreFields.hostRisk,
                  },
                },
                incompleteColumns: {},
              },
            },
          },
        },
        filters: [],
        query: { language: 'kuery', query: '' },
        visualization: {
          columns: [
            { columnId: '9c8c581f-6cb8-4ecf-8eb3-4c6df33edc5d', isTransposed: false },
            {
              alignment: 'left',
              columnId: 'c547501b-fe04-4073-8b4e-dbbdc3a4ff04',
              hidden: true,
              isTransposed: false,
            },
            { columnId: 'e2444d64-721a-4532-9633-5b206eee76d6', isTransposed: false },
          ],
          layerId: '2f34d626-d0ee-4ade-9e75-13c480699485',
        },
      },
      title: 'Current Risk Score for Hosts',
      visualizationType: 'lnsDatatable',
    },
    coreMigrationVersion: '7.13.4',
    id: '<REPLACE-WITH-ID7>',
    migrationVersion: { lens: '7.13.1' },
    references: [
      {
        id: '<REPLACE-WITH-ID9>',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: '<REPLACE-WITH-ID9>',
        name: 'indexpattern-datasource-layer-2f34d626-d0ee-4ade-9e75-13c480699485',
        type: 'index-pattern',
      },
    ],
    type: 'lens',
    updated_at: '2021-08-18T17:07:41.806Z',
  },
  {
    attributes: {
      description:
        'This dashboard shows the most current list of risky hosts (Top 20) in an environment. ',
      hits: 0,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"language":"kuery","query":""},"filter":[]}',
      },
      optionsJSON: '{"hidePanelTitles":false,"useMargins":true}',
      panelsJSON:
        '[{"version":"7.13.4","type":"visualization","gridData":{"x":0,"y":0,"w":48,"h":3,"i":"287b65e9-0aaa-42ee-ab7b-d60b3937d37a"},"panelIndex":"287b65e9-0aaa-42ee-ab7b-d60b3937d37a","embeddableConfig":{"savedVis":{"title":"","description":"","type":"markdown","params":{"fontSize":12,"openLinksInNewTab":false,"markdown":"The Host Risk Score capability is an experimental feature released in 7.14. You can read further about it [here](https://github.com/elastic/detection-rules/blob/main/docs/experimental-machine-learning/host-risk-score.md)."},"uiState":{},"data":{"aggs":[],"searchSource":{"query":{"query":"","language":"kuery"},"filter":[]}}},"hidePanelTitles":true,"enhancements":{}},"title":"Note:"},{"version":"7.13.4","type":"lens","gridData":{"x":16,"y":3,"w":16,"h":15,"i":"654d55f8-f873-4348-96cd-5dce0b56ac32"},"panelIndex":"654d55f8-f873-4348-96cd-5dce0b56ac32","embeddableConfig":{"enhancements":{"dynamicActions":{"events":[{"eventId":"b04e60d5-4e34-4589-af2e-8e9c3a15936f","triggers":["FILTER_TRIGGER"],"action":{"factoryId":"DASHBOARD_TO_DASHBOARD_DRILLDOWN","name":"Go to Dashboard","config":{"useCurrentFilters":true,"useCurrentDateRange":true}}}]}},"hidePanelTitles":false},"title":"Current Risk Scores for Hosts","panelRefName":"panel_654d55f8-f873-4348-96cd-5dce0b56ac32"}]',
      timeRestore: false,
      title: 'Current Risk Score for Hosts',
      version: 1,
    },
    coreMigrationVersion: '7.13.4',
    id: '<REPLACE-WITH-ID8>',
    migrationVersion: { dashboard: '7.13.1' },
    references: [
      {
        id: '<REPLACE-WITH-ID7>',
        name: '654d55f8-f873-4348-96cd-5dce0b56ac32:panel_654d55f8-f873-4348-96cd-5dce0b56ac32',
        type: 'lens',
      },
      {
        id: '<REPLACE-WITH-ID6>',
        name: '654d55f8-f873-4348-96cd-5dce0b56ac32:drilldown:DASHBOARD_TO_DASHBOARD_DRILLDOWN:b04e60d5-4e34-4589-af2e-8e9c3a15936f:dashboardId',
        type: 'dashboard',
      },
      {
        id: '<REPLACE-WITH-ID5>',
        name: 'tag-1d00ebe0-f3b2-11eb-beb2-b91666445a94',
        type: 'tag',
      },
    ],
    type: 'dashboard',
    updated_at: '2021-08-18T17:08:00.467Z',
  },
];
