/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObject } from '@kbn/core/types';

export const userRiskScoreDashboards: SavedObject[] = [
  {
    attributes: {
      fieldAttrs:
        '{"kibana.alert.rule.name":{"count":2},"signal.rule.name":{"count":2},"signal.rule.risk_score":{"count":2},"signal.rule.type":{"count":1},"host.os.family":{"count":1},"host.os.full":{"count":1},"host.os.name":{"count":1},"host.os.platform":{"count":1},"host.os.version":{"count":1},"signal.rule.rule_id":{"count":2},"signal.rule.threat.tactic.id":{"count":2},"host.id":{"count":1},"host.name":{"count":1}}',
      fields: '[]',
      runtimeFieldMap: '{}',
      timeFieldName: '@timestamp',
      title: '.siem-signals-<REPLACE-WITH-SPACE>',
      typeMeta: '{}',
    },
    coreMigrationVersion: '8.3.0',
    id: 'd3ae2f80-fbc1-11eb-bac9-4d64e825480b',
    migrationVersion: { 'index-pattern': '8.0.0' },
    references: [],
    type: 'index-pattern',
    updated_at: '2022-06-22T21:55:25.560Z',
  },
  {
    attributes: { color: '#32057a', description: '', name: 'ueba' },
    coreMigrationVersion: '8.3.0',
    id: '14104360-2534-11ec-ad40-03fece8605c9',
    migrationVersion: { tag: '8.0.0' },
    references: [],
    type: 'tag',
    updated_at: '2022-06-22T21:55:25.560Z',
  },
  {
    attributes: {
      description: '',
      state: {
        datasourceStates: {
          indexpattern: {
            layers: {
              'b885eaad-3c68-49ad-9891-70158d912dbd': {
                columnOrder: [
                  '1fced52d-7ba5-4254-8656-fe0d7ced586a',
                  'e82aed80-ee04-4ad1-9b9d-fde4a25be58a',
                  '1d9b32cd-62d9-44e5-bf43-109011adc714',
                  '1d9b32cd-62d9-44e5-bf43-109011adc714X0',
                  '1d9b32cd-62d9-44e5-bf43-109011adc714X1',
                ],
                columns: {
                  '1d9b32cd-62d9-44e5-bf43-109011adc714': {
                    dataType: 'number',
                    isBucketed: false,
                    label: 'cumulative_sum(sum(signal.rule.risk_score))',
                    operationType: 'formula',
                    params: {
                      formula: 'cumulative_sum(sum(signal.rule.risk_score))',
                      isFormulaBroken: false,
                    },
                    references: ['1d9b32cd-62d9-44e5-bf43-109011adc714X1'],
                    scale: 'ratio',
                  },
                  '1d9b32cd-62d9-44e5-bf43-109011adc714X0': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Part of cumulative_sum(sum(signal.rule.risk_score))',
                    operationType: 'sum',
                    params: { emptyAsNull: false },
                    scale: 'ratio',
                    sourceField: 'signal.rule.risk_score',
                  },
                  '1d9b32cd-62d9-44e5-bf43-109011adc714X1': {
                    customLabel: true,
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Part of cumulative_sum(sum(signal.rule.risk_score))',
                    operationType: 'cumulative_sum',
                    references: ['1d9b32cd-62d9-44e5-bf43-109011adc714X0'],
                    scale: 'ratio',
                  },
                  '1fced52d-7ba5-4254-8656-fe0d7ced586a': {
                    dataType: 'string',
                    isBucketed: true,
                    label: 'Top 30 values of user.name',
                    operationType: 'terms',
                    params: {
                      missingBucket: false,
                      orderBy: { fallback: true, type: 'alphabetical' },
                      orderDirection: 'asc',
                      otherBucket: false,
                      parentFormat: { id: 'terms' },
                      size: 30,
                    },
                    scale: 'ordinal',
                    sourceField: 'user.name',
                  },
                  'e82aed80-ee04-4ad1-9b9d-fde4a25be58a': {
                    dataType: 'date',
                    isBucketed: true,
                    label: '@timestamp',
                    operationType: 'date_histogram',
                    params: { includeEmptyRows: true, interval: '1d' },
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
        query: { language: 'kuery', query: 'not user.name: SYSTEM' },
        visualization: {
          layers: [
            {
              accessors: ['1d9b32cd-62d9-44e5-bf43-109011adc714'],
              layerId: 'b885eaad-3c68-49ad-9891-70158d912dbd',
              layerType: 'data',
              position: 'top',
              seriesType: 'bar_stacked',
              showGridlines: false,
              splitAccessor: '1fced52d-7ba5-4254-8656-fe0d7ced586a',
              xAccessor: 'e82aed80-ee04-4ad1-9b9d-fde4a25be58a',
            },
          ],
          legend: { isVisible: true, legendSize: 'auto', position: 'right' },
          preferredSeriesType: 'bar_stacked',
          title: 'Empty XY chart',
          valueLabels: 'hide',
          yLeftExtent: { mode: 'full' },
          yRightExtent: { mode: 'full' },
        },
      },
      title: 'User Risk Score (Max Risk Score Histogram)',
      visualizationType: 'lnsXY',
    },
    coreMigrationVersion: '8.3.0',
    id: '60454070-9a5d-11ec-9633-5f782d122340',
    migrationVersion: { lens: '8.3.0' },
    references: [
      {
        id: 'd3ae2f80-fbc1-11eb-bac9-4d64e825480b',
        name: 'indexpattern-datasource-layer-b885eaad-3c68-49ad-9891-70158d912dbd',
        type: 'index-pattern',
      },
      {
        id: '14104360-2534-11ec-ad40-03fece8605c9',
        name: 'tag-ref-14104360-2534-11ec-ad40-03fece8605c9',
        type: 'tag',
      },
    ],
    type: 'lens',
    updated_at: '2022-06-22T22:06:12.160Z',
  },
  {
    attributes: {
      fieldAttrs:
        '{"signal.rule.type":{"count":1},"host.name":{"count":1},"signal.rule.name":{"count":1}}',
      fields: '[]',
      runtimeFieldMap: '{}',
      timeFieldName: '@timestamp',
      title: '.siem-signals-<REPLACE-WITH-SPACE>',
      typeMeta: '{}',
    },
    coreMigrationVersion: '8.3.0',
    id: 'siem-signals-default-index-pattern',
    migrationVersion: { 'index-pattern': '8.0.0' },
    references: [],
    type: 'index-pattern',
    updated_at: '2022-06-22T21:55:25.560Z',
  },
  {
    attributes: {
      description: '',
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"query":{"query":"user.name: root","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
      title: 'Associated Users (Rule Breakdown)',
      uiStateJSON: '{}',
      version: 1,
      visState:
        '{"title":"Associated Users (Rule Breakdown)","type":"table","aggs":[{"id":"2","enabled":true,"type":"sum","params":{"field":"signal.rule.risk_score","customLabel":"Total Risk Score","emptyAsNull":false},"schema":"metric"},{"id":"1","enabled":true,"type":"count","params":{"customLabel":"Number of Hits","emptyAsNull":false},"schema":"metric"},{"id":"3","enabled":true,"type":"terms","params":{"field":"user.name","orderBy":"2","order":"desc","size":20,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"User"},"schema":"split"},{"id":"4","enabled":true,"type":"terms","params":{"field":"signal.rule.name","orderBy":"2","order":"desc","size":50,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Rule Name"},"schema":"bucket"},{"id":"5","enabled":true,"type":"terms","params":{"field":"signal.rule.type","orderBy":"2","order":"desc","size":50,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Rule Type"},"schema":"bucket"}],"params":{"perPage":25,"showPartialRows":false,"showMetricsAtAllLevels":false,"showTotal":false,"showToolbar":false,"totalFunc":"sum","percentageCol":"","row":true,"autoFitRowToContent":true}}',
    },
    coreMigrationVersion: '8.3.0',
    id: 'a62d3ed0-cf92-11eb-a0ff-1763d16cbda7',
    migrationVersion: { visualization: '8.3.0' },
    references: [
      {
        id: 'siem-signals-default-index-pattern',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
    type: 'visualization',
    updated_at: '2022-06-22T22:01:24.771Z',
  },
  {
    attributes: {
      description: '',
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
      title: 'Alerts by Hostname',
      uiStateJSON: '{}',
      version: 1,
      visState:
        '{"title":"Host Risk Score (Rule Breakdown)","type":"table","aggs":[{"id":"2","enabled":true,"type":"sum","params":{"field":"signal.rule.risk_score","customLabel":"Total Risk Score"},"schema":"metric"},{"id":"1","enabled":true,"type":"count","params":{"customLabel":"Number of Hits"},"schema":"metric"},{"id":"3","enabled":true,"type":"terms","params":{"field":"host.name","orderBy":"2","order":"desc","size":20,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Host"},"schema":"split"},{"id":"4","enabled":true,"type":"terms","params":{"field":"signal.rule.name","orderBy":"2","order":"desc","size":20,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Rule Name"},"schema":"bucket"},{"id":"5","enabled":true,"type":"terms","params":{"field":"signal.rule.type","orderBy":"2","order":"desc","size":20,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Rule Type"},"schema":"bucket"}],"params":{"perPage":10,"showPartialRows":false,"showMetricsAtAllLevels":false,"showTotal":false,"showToolbar":false,"totalFunc":"sum","percentageCol":"","row":true}}',
    },
    coreMigrationVersion: '8.3.0',
    id: '42371d00-cf7a-11eb-9a96-05d89f94ad96',
    migrationVersion: { visualization: '8.3.0' },
    references: [
      {
        id: 'siem-signals-default-index-pattern',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
    type: 'visualization',
    updated_at: '2022-06-22T21:55:25.560Z',
  },
  {
    attributes: {
      description: '',
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"query":{"query":"not user.name : *$","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
      },
      title: 'User Risk Score (Tactic Breakdown)- Verbose',
      uiStateJSON: '{}',
      version: 1,
      visState:
        '{"title":"User Risk Score (Tactic Breakdown)- Verbose","type":"table","aggs":[{"id":"1","enabled":true,"type":"sum","params":{"field":"signal.rule.risk_score","customLabel":"Total Risk Score"},"schema":"metric"},{"id":"3","enabled":true,"type":"terms","params":{"field":"user.name","orderBy":"1","order":"desc","size":40,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":false,"missingBucketLabel":"Missing","customLabel":"Username"},"schema":"split"},{"id":"5","enabled":true,"type":"terms","params":{"field":"signal.rule.threat.tactic.name","orderBy":"1","order":"desc","size":100,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":true,"missingBucketLabel":"Other","customLabel":"Tactic"},"schema":"bucket"},{"id":"6","enabled":true,"type":"terms","params":{"field":"signal.rule.threat.technique.name","orderBy":"1","order":"desc","size":100,"otherBucket":false,"otherBucketLabel":"Other","missingBucket":true,"missingBucketLabel":"Other","customLabel":"Technique"},"schema":"bucket"},{"id":"7","enabled":true,"type":"count","params":{"customLabel":"Number of Hits"},"schema":"metric"}],"params":{"perPage":10,"showPartialRows":false,"showMetricsAtAllLevels":false,"showTotal":false,"showToolbar":false,"totalFunc":"sum","percentageCol":"","row":true,"autoFitRowToContent":false}}',
    },
    coreMigrationVersion: '8.3.0',
    id: '183d32f0-9a5e-11ec-90d3-1109ed409ab5',
    migrationVersion: { visualization: '8.3.0' },
    references: [
      {
        id: 'siem-signals-default-index-pattern',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
      },
    ],
    type: 'visualization',
    updated_at: '2022-06-22T21:55:25.560Z',
  },
  {
    attributes: { color: '#D36086', description: '', name: 'experimental' },
    coreMigrationVersion: '8.3.0',
    id: '1d00ebe0-f3b2-11eb-beb2-b91666445a94',
    migrationVersion: { tag: '8.0.0' },
    references: [],
    type: 'tag',
    updated_at: '2022-06-22T21:55:25.560Z',
  },
  {
    attributes: { color: '#8aa96b', description: '', name: 'release' },
    coreMigrationVersion: '8.3.0',
    id: '2d22b2c0-feb0-11eb-bac9-4d64e825480b',
    migrationVersion: { tag: '8.0.0' },
    references: [],
    type: 'tag',
    updated_at: '2022-06-22T21:55:25.560Z',
  },
  {
    attributes: {
      description:
        'This dashboard allows users to drill down further into the details of the risk components associated with a particular user.',
      hits: 0,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
      optionsJSON: '{"hidePanelTitles":false,"useMargins":true}',
      panelsJSON:
        '[{"version":"8.3.0","type":"visualization","gridData":{"x":0,"y":0,"w":48,"h":3,"i":"eaa57cf4-7ca3-4919-ab76-dbac0eb6a195"},"panelIndex":"eaa57cf4-7ca3-4919-ab76-dbac0eb6a195","embeddableConfig":{"savedVis":{"title":"","description":"","type":"markdown","params":{"fontSize":12,"openLinksInNewTab":false,"markdown":"The User Risk Score capability is an experimental feature. You can read further about it [here]"},"uiState":{},"data":{"aggs":[],"searchSource":{"query":{"query":"","language":"kuery"},"filter":[]}}},"hidePanelTitles":true,"enhancements":{},"type":"visualization"}},{"version":"8.0.0","type":"lens","gridData":{"x":0,"y":3,"w":48,"h":15,"i":"b3fdccab-59c1-47c8-9393-fa043e0dff83"},"panelIndex":"b3fdccab-59c1-47c8-9393-fa043e0dff83","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_b3fdccab-59c1-47c8-9393-fa043e0dff83"},{"version":"8.0.0","type":"visualization","gridData":{"x":0,"y":18,"w":26,"h":65,"i":"8d09b97c-a023-4b7e-9e9d-1c46e726a487"},"panelIndex":"8d09b97c-a023-4b7e-9e9d-1c46e726a487","embeddableConfig":{"enhancements":{"dynamicActions":{"events":[{"eventId":"593ff0e6-25da-47ad-b81d-9a0106c0e9aa","triggers":["VALUE_CLICK_TRIGGER"],"action":{"factoryId":"URL_DRILLDOWN","name":"Go to User View","config":{"url":{"template":"{{kibanaUrl}}/app/security/hosts/{{context.panel.filters.[0].meta.params.query}}"},"openInNewTab":true,"encodeUrl":true}}}]}},"hidePanelTitles":false,"vis":{"params":{"colWidth":[{"colIndex":0,"width":410.5}]}}},"title":"Alert Counts by User","panelRefName":"panel_8d09b97c-a023-4b7e-9e9d-1c46e726a487"},{"version":"8.0.0","type":"visualization","gridData":{"x":26,"y":18,"w":22,"h":65,"i":"cae82aa1-20c8-4354-94ab-3934ac53b8fe"},"panelIndex":"cae82aa1-20c8-4354-94ab-3934ac53b8fe","embeddableConfig":{"enhancements":{"dynamicActions":{"events":[{"eventId":"0fd43778-bd5d-4b2b-85c3-47ac3b756434","triggers":["VALUE_CLICK_TRIGGER"],"action":{"factoryId":"URL_DRILLDOWN","name":"Go to User View","config":{"url":{"template":"{{kibanaUrl}}/app/security/hosts/{{context.panel.filters.[0].meta.params.query}}"},"openInNewTab":true,"encodeUrl":true}}}]}},"hidePanelTitles":false,"vis":{"params":{"colWidth":[{"colIndex":0,"width":304}]}}},"title":"Alert Counts by Host","panelRefName":"panel_cae82aa1-20c8-4354-94ab-3934ac53b8fe"},{"version":"8.0.0","type":"visualization","gridData":{"x":0,"y":83,"w":48,"h":15,"i":"ca3c8903-be5d-4265-820c-cc3d67443af2"},"panelIndex":"ca3c8903-be5d-4265-820c-cc3d67443af2","embeddableConfig":{"enhancements":{}},"panelRefName":"panel_ca3c8903-be5d-4265-820c-cc3d67443af2"}]',
      timeRestore: false,
      title: 'Drilldown of User Risk Score',
      version: 1,
    },
    coreMigrationVersion: '8.3.0',
    id: '1355b030-ca2b-11ec-962f-a3a018b7d10f',
    migrationVersion: { dashboard: '8.3.0' },
    references: [
      {
        id: '60454070-9a5d-11ec-9633-5f782d122340',
        name: 'b3fdccab-59c1-47c8-9393-fa043e0dff83:panel_b3fdccab-59c1-47c8-9393-fa043e0dff83',
        type: 'lens',
      },
      {
        id: 'a62d3ed0-cf92-11eb-a0ff-1763d16cbda7',
        name: '8d09b97c-a023-4b7e-9e9d-1c46e726a487:panel_8d09b97c-a023-4b7e-9e9d-1c46e726a487',
        type: 'visualization',
      },
      {
        id: '42371d00-cf7a-11eb-9a96-05d89f94ad96',
        name: 'cae82aa1-20c8-4354-94ab-3934ac53b8fe:panel_cae82aa1-20c8-4354-94ab-3934ac53b8fe',
        type: 'visualization',
      },
      {
        id: '183d32f0-9a5e-11ec-90d3-1109ed409ab5',
        name: 'ca3c8903-be5d-4265-820c-cc3d67443af2:panel_ca3c8903-be5d-4265-820c-cc3d67443af2',
        type: 'visualization',
      },
      {
        id: '1d00ebe0-f3b2-11eb-beb2-b91666445a94',
        name: 'tag-1d00ebe0-f3b2-11eb-beb2-b91666445a94',
        type: 'tag',
      },
      {
        id: '14104360-2534-11ec-ad40-03fece8605c9',
        name: 'tag-14104360-2534-11ec-ad40-03fece8605c9',
        type: 'tag',
      },
      {
        id: '2d22b2c0-feb0-11eb-bac9-4d64e825480b',
        name: 'tag-2d22b2c0-feb0-11eb-bac9-4d64e825480b',
        type: 'tag',
      },
    ],
    type: 'dashboard',
    updated_at: '2022-06-22T21:55:26.622Z',
  },
  {
    attributes: {
      fieldAttrs: '{}',
      fields: '[]',
      runtimeFieldMap: '{}',
      timeFieldName: '@timestamp',
      title: '.siem-signals-<REPLACE-WITH-SPACE>',
      typeMeta: '{}',
    },
    coreMigrationVersion: '8.3.0',
    id: '6a98e860-f264-11ec-b875-8dd104de3c0f',
    migrationVersion: { 'index-pattern': '8.0.0' },
    references: [],
    type: 'index-pattern',
    updated_at: '2022-06-22T19:49:24.075Z',
  },
  {
    attributes: {
      fieldAttrs: '{"user.name":{"count":1}}',
      fields: '[]',
      runtimeFieldMap: '{}',
      timeFieldName: '@timestamp',
      title: 'ml_user_risk_score_latest_default',
      typeMeta: '{}',
    },
    coreMigrationVersion: '8.3.0',
    id: '0edd6710-cfd4-11ec-962f-a3a018b7d10f',
    migrationVersion: { 'index-pattern': '8.0.0' },
    references: [],
    type: 'index-pattern',
    updated_at: '2022-06-22T21:55:25.560Z',
  },
  {
    attributes: {
      description: '',
      state: {
        datasourceStates: {
          indexpattern: {
            layers: {
              '4fd27c60-031c-4cd6-9cc3-42eba11e4dc5': {
                columnOrder: [
                  'a56deeb6-7001-42a3-80bf-d0d4cd389864',
                  'f78c300e-883b-469b-bc12-c1bd1a3567c9',
                  'd54be677-903e-45f4-8218-8e21fbcc692e',
                ],
                columns: {
                  'a56deeb6-7001-42a3-80bf-d0d4cd389864': {
                    dataType: 'string',
                    isBucketed: true,
                    label: 'Top values of user.name',
                    operationType: 'terms',
                    params: {
                      missingBucket: false,
                      orderBy: { columnId: 'd54be677-903e-45f4-8218-8e21fbcc692e', type: 'column' },
                      orderDirection: 'desc',
                      otherBucket: true,
                      parentFormat: { id: 'terms' },
                      size: 100,
                    },
                    scale: 'ordinal',
                    sourceField: 'user.name',
                  },
                  'd54be677-903e-45f4-8218-8e21fbcc692e': {
                    dataType: 'number',
                    isBucketed: false,
                    label: 'Sum of risk_stats.risk_score',
                    operationType: 'sum',
                    scale: 'ratio',
                    sourceField: 'risk_stats.risk_score',
                  },
                  'f78c300e-883b-469b-bc12-c1bd1a3567c9': {
                    dataType: 'string',
                    isBucketed: true,
                    label: 'Top values of risk.keyword',
                    operationType: 'terms',
                    params: {
                      missingBucket: false,
                      orderBy: { columnId: 'd54be677-903e-45f4-8218-8e21fbcc692e', type: 'column' },
                      orderDirection: 'desc',
                      otherBucket: true,
                      parentFormat: { id: 'terms' },
                      size: 3,
                    },
                    scale: 'ordinal',
                    sourceField: 'risk.keyword',
                  },
                },
                incompleteColumns: {},
              },
            },
          },
        },
        filters: [
          {
            $state: { store: 'appState' },
            meta: {
              alias: null,
              disabled: false,
              index: '915f434c-c7d6-4813-be8a-620ce7b2bfab',
              key: 'risk.keyword',
              negate: true,
              params: { query: 'Unknown' },
              type: 'phrase',
            },
            query: { match_phrase: { 'risk.keyword': 'Unknown' } },
          },
        ],
        query: { language: 'kuery', query: '' },
        visualization: {
          columns: [
            { columnId: 'a56deeb6-7001-42a3-80bf-d0d4cd389864', isTransposed: false },
            { columnId: 'f78c300e-883b-469b-bc12-c1bd1a3567c9', isTransposed: false },
            { columnId: 'd54be677-903e-45f4-8218-8e21fbcc692e', hidden: true, isTransposed: false },
          ],
          layerId: '4fd27c60-031c-4cd6-9cc3-42eba11e4dc5',
          layerType: 'data',
          rowHeight: 'single',
          rowHeightLines: 1,
        },
      },
      title: 'Current Risk Score For Users',
      visualizationType: 'lnsDatatable',
    },
    coreMigrationVersion: '8.3.0',
    id: '3b1fd7f0-d52d-11ec-b370-e3adc339bc8c',
    migrationVersion: { lens: '8.3.0' },
    references: [
      {
        id: '0edd6710-cfd4-11ec-962f-a3a018b7d10f',
        name: 'indexpattern-datasource-layer-4fd27c60-031c-4cd6-9cc3-42eba11e4dc5',
        type: 'index-pattern',
      },
      {
        id: '0edd6710-cfd4-11ec-962f-a3a018b7d10f',
        name: '915f434c-c7d6-4813-be8a-620ce7b2bfab',
        type: 'index-pattern',
      },
      {
        id: '14104360-2534-11ec-ad40-03fece8605c9',
        name: 'tag-ref-14104360-2534-11ec-ad40-03fece8605c9',
        type: 'tag',
      },
    ],
    type: 'lens',
    updated_at: '2022-06-22T22:07:54.553Z',
  },
  {
    attributes: {
      description: '',
      hits: 0,
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"query":{"query":"","language":"kuery"},"filter":[{"meta":{"negate":true,"type":"phrase","key":"risk.keyword","params":{"query":"Unknown"},"disabled":true,"alias":null,"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index"},"query":{"match_phrase":{"risk.keyword":"Unknown"}},"$state":{"store":"appState"}}]}',
      },
      optionsJSON: '{"useMargins":true,"syncColors":false,"hidePanelTitles":false}',
      panelsJSON:
        '[{"version":"8.0.0","type":"lens","gridData":{"x":11,"y":0,"w":25,"h":32,"i":"359e8a84-bc4a-4c1d-ab11-5fc73f6769a6"},"panelIndex":"359e8a84-bc4a-4c1d-ab11-5fc73f6769a6","embeddableConfig":{"enhancements":{"dynamicActions":{"events":[{"eventId":"299d13ec-93f5-48ce-a98d-cf7aeeca37d6","triggers":["FILTER_TRIGGER"],"action":{"factoryId":"DASHBOARD_TO_DASHBOARD_DRILLDOWN","name":"Go to Dashboard","config":{"useCurrentFilters":true,"useCurrentDateRange":true}}}]}}},"panelRefName":"panel_359e8a84-bc4a-4c1d-ab11-5fc73f6769a6"}]',
      timeRestore: false,
      title: 'Current Risk Score For Users',
      version: 1,
    },
    coreMigrationVersion: '8.3.0',
    id: '065c6df0-d530-11ec-b370-e3adc339bc8c',
    migrationVersion: { dashboard: '8.3.0' },
    references: [
      {
        id: '6a98e860-f264-11ec-b875-8dd104de3c0f',
        name: 'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
        type: 'index-pattern',
      },
      {
        id: '3b1fd7f0-d52d-11ec-b370-e3adc339bc8c',
        name: '359e8a84-bc4a-4c1d-ab11-5fc73f6769a6:panel_359e8a84-bc4a-4c1d-ab11-5fc73f6769a6',
        type: 'lens',
      },
      {
        id: '1355b030-ca2b-11ec-962f-a3a018b7d10f',
        name: '359e8a84-bc4a-4c1d-ab11-5fc73f6769a6:drilldown:DASHBOARD_TO_DASHBOARD_DRILLDOWN:299d13ec-93f5-48ce-a98d-cf7aeeca37d6:dashboardId',
        type: 'dashboard',
      },
      {
        id: '1d00ebe0-f3b2-11eb-beb2-b91666445a94',
        name: 'tag-1d00ebe0-f3b2-11eb-beb2-b91666445a94',
        type: 'tag',
      },
      {
        id: '14104360-2534-11ec-ad40-03fece8605c9',
        name: 'tag-14104360-2534-11ec-ad40-03fece8605c9',
        type: 'tag',
      },
      {
        id: '2d22b2c0-feb0-11eb-bac9-4d64e825480b',
        name: 'tag-2d22b2c0-feb0-11eb-bac9-4d64e825480b',
        type: 'tag',
      },
    ],
    type: 'dashboard',
    updated_at: '2022-06-22T21:55:26.622Z',
  },
];
