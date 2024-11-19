/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockGetDashboardsResult = [
  {
    type: 'dashboard',
    id: 'd698d5f0-cd58-11ed-affc-fb75e701db4b',
    namespaces: ['default'],
    attributes: {
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
      description: '',
      timeRestore: false,
      optionsJSON:
        '{"useMargins":true,"syncColors":false,"syncCursor":true,"syncTooltips":false,"hidePanelTitles":false}',
      panelsJSON:
        '[{"version":"8.8.0","type":"lens","gridData":{"x":0,"y":0,"w":24,"h":15,"i":"46c2105e-0edd-460c-8ecf-aaf3777b0c9b"},"panelIndex":"46c2105e-0edd-460c-8ecf-aaf3777b0c9b","embeddableConfig":{"attributes":{"title":"my alerts chart","description":"","visualizationType":"lnsXY","type":"lens","references":[{"type":"index-pattern","id":"security-solution-default","name":"indexpattern-datasource-layer-eafb5cfd-bd7e-4c1f-a675-ef11a17c616d"}],"state":{"visualization":{"title":"Empty XY chart","legend":{"isVisible":true,"position":"left","legendSize":"xlarge","legendStats":["currentAndLastValue"]},"valueLabels":"hide","preferredSeriesType":"bar_stacked","layers":[{"layerId":"eafb5cfd-bd7e-4c1f-a675-ef11a17c616d","accessors":["e09e0380-0740-4105-becc-0a4ca12e3944"],"position":"top","seriesType":"bar_stacked","showGridlines":false,"layerType":"data","xAccessor":"aac9d7d0-13a3-480a-892b-08207a787926","splitAccessor":"34919782-4546-43a5-b668-06ac934d3acd"}],"yRightExtent":{"mode":"full"},"yLeftExtent":{"mode":"full"},"axisTitlesVisibilitySettings":{"x":false,"yLeft":false,"yRight":true}},"query":{"query":"","language":"kuery"},"filters":[{"meta":{"alias":null,"negate":true,"disabled":false,"type":"exists","key":"kibana.alert.building_block_type"},"query":{"exists":{"field":"kibana.alert.building_block_type"}},"$state":{"store":"appState"}},{"meta":{"type":"phrases","key":"_index","params":[".alerts-security.alerts-default"],"alias":null,"negate":false,"disabled":false},"query":{"bool":{"should":[{"match_phrase":{"_index":".alerts-security.alerts-default"}}],"minimum_should_match":1}},"$state":{"store":"appState"}}],"datasourceStates":{"formBased":{"layers":{"eafb5cfd-bd7e-4c1f-a675-ef11a17c616d":{"columns":{"aac9d7d0-13a3-480a-892b-08207a787926":{"label":"@timestamp","dataType":"date","operationType":"date_histogram","sourceField":"@timestamp","isBucketed":true,"scale":"interval","params":{"interval":"auto"}},"e09e0380-0740-4105-becc-0a4ca12e3944":{"label":"Count of records","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___"},"34919782-4546-43a5-b668-06ac934d3acd":{"label":"Top values of kibana.alert.rule.name","dataType":"string","operationType":"terms","scale":"ordinal","sourceField":"kibana.alert.rule.name","isBucketed":true,"params":{"size":1000,"orderBy":{"type":"column","columnId":"e09e0380-0740-4105-becc-0a4ca12e3944"},"orderDirection":"desc","otherBucket":true,"missingBucket":false,"parentFormat":{"id":"terms"},"secondaryFields":[]}}},"columnOrder":["34919782-4546-43a5-b668-06ac934d3acd","aac9d7d0-13a3-480a-892b-08207a787926","e09e0380-0740-4105-becc-0a4ca12e3944"],"incompleteColumns":{}}}}},"internalReferences":[],"adHocDataViews":{}}},"enhancements":{}}},{"version":"8.8.0","type":"lens","gridData":{"x":24,"y":0,"w":24,"h":15,"i":"8bcec072-4cf2-417d-a740-2b7f34c69473"},"panelIndex":"8bcec072-4cf2-417d-a740-2b7f34c69473","embeddableConfig":{"attributes":{"title":"events","description":"","visualizationType":"lnsXY","type":"lens","references":[{"type":"index-pattern","id":"security-solution-default","name":"indexpattern-datasource-layer-63ba54b1-ca7d-4fa3-b43b-d748723abad4"}],"state":{"visualization":{"title":"Empty XY chart","legend":{"isVisible":true,"position":"left","legendSize":"xlarge"},"valueLabels":"hide","preferredSeriesType":"bar_stacked","layers":[{"layerId":"63ba54b1-ca7d-4fa3-b43b-d748723abad4","accessors":["e09e0380-0740-4105-becc-0a4ca12e3944"],"position":"top","seriesType":"bar_stacked","showGridlines":false,"layerType":"data","xAccessor":"aac9d7d0-13a3-480a-892b-08207a787926","splitAccessor":"34919782-4546-43a5-b668-06ac934d3acd"}],"yRightExtent":{"mode":"full"},"yLeftExtent":{"mode":"full"},"axisTitlesVisibilitySettings":{"x":false,"yLeft":false,"yRight":true}},"query":{"query":"","language":"kuery"},"filters":[{"meta":{"alias":null,"disabled":false,"key":"query","negate":false,"type":"custom"},"query":{"bool":{"should":[{"exists":{"field":"host.name"}}],"minimum_should_match":1}},"$state":{"store":"appState"}},{"meta":{"type":"phrases","key":"_index","params":["auditbeat-*","packetbeat-*"],"alias":null,"negate":false,"disabled":false},"query":{"bool":{"should":[{"match_phrase":{"_index":"auditbeat-*"}},{"match_phrase":{"_index":"packetbeat-*"}}],"minimum_should_match":1}},"$state":{"store":"appState"}}],"datasourceStates":{"formBased":{"layers":{"63ba54b1-ca7d-4fa3-b43b-d748723abad4":{"columns":{"aac9d7d0-13a3-480a-892b-08207a787926":{"label":"@timestamp","dataType":"date","operationType":"date_histogram","sourceField":"@timestamp","isBucketed":true,"scale":"interval","params":{"interval":"auto"}},"e09e0380-0740-4105-becc-0a4ca12e3944":{"label":"Count of records","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___"},"34919782-4546-43a5-b668-06ac934d3acd":{"label":"Top values of event.action","dataType":"string","operationType":"terms","scale":"ordinal","sourceField":"event.action","isBucketed":true,"params":{"size":10,"orderBy":{"type":"column","columnId":"e09e0380-0740-4105-becc-0a4ca12e3944"},"orderDirection":"desc","otherBucket":true,"missingBucket":false,"parentFormat":{"id":"terms"}}}},"columnOrder":["34919782-4546-43a5-b668-06ac934d3acd","aac9d7d0-13a3-480a-892b-08207a787926","e09e0380-0740-4105-becc-0a4ca12e3944"],"incompleteColumns":{}}}}},"internalReferences":[],"adHocDataViews":{}}},"enhancements":{}}}]',
      title: 'my alerts dashboard',
      version: 1,
    },
    references: [
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: '46c2105e-0edd-460c-8ecf-aaf3777b0c9b:indexpattern-datasource-layer-eafb5cfd-bd7e-4c1f-a675-ef11a17c616d',
      },
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: '8bcec072-4cf2-417d-a740-2b7f34c69473:indexpattern-datasource-layer-63ba54b1-ca7d-4fa3-b43b-d748723abad4',
      },
      {
        type: 'tag',
        id: 'de7ad1f0-ccc8-11ed-9175-1b0d4269ff48',
        name: 'tag-ref-de7ad1f0-ccc8-11ed-9175-1b0d4269ff48',
      },
    ],
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '8.7.0',
    updated_at: '2023-03-28T11:27:28.365Z',
    created_at: '2023-03-28T11:27:28.365Z',
    version: 'WzE3NTIwLDFd',
    score: 0,
  },
  {
    type: 'dashboard',
    id: 'eee18bf0-cfc1-11ed-8380-f532c904188c',
    namespaces: ['default'],
    attributes: {
      kibanaSavedObjectMeta: {
        searchSourceJSON:
          '{"query":{"query":"","language":"kuery"},"filter":[{"meta":{"type":"phrase","key":"event.action","params":{"query":"process_stopped"},"disabled":false,"negate":false,"alias":null,"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index"},"query":{"match_phrase":{"event.action":"process_stopped"}},"$state":{"store":"appState"}}]}',
      },
      description: '',
      timeRestore: false,
      optionsJSON:
        '{"useMargins":true,"syncColors":false,"syncCursor":true,"syncTooltips":false,"hidePanelTitles":false}',
      panelsJSON:
        '[{"version":"8.8.0","type":"lens","gridData":{"x":0,"y":0,"w":24,"h":15,"i":"46c2105e-0edd-460c-8ecf-aaf3777b0c9b"},"panelIndex":"46c2105e-0edd-460c-8ecf-aaf3777b0c9b","embeddableConfig":{"attributes":{"title":"my alerts chart","description":"","visualizationType":"lnsXY","type":"lens","references":[{"type":"index-pattern","id":"security-solution-default","name":"indexpattern-datasource-layer-eafb5cfd-bd7e-4c1f-a675-ef11a17c616d"}],"state":{"visualization":{"title":"Empty XY chart","legend":{"isVisible":true,"position":"left","legendSize":"xlarge", "legendStats":["currentAndLastValue"]},"valueLabels":"hide","preferredSeriesType":"bar_stacked","layers":[{"layerId":"eafb5cfd-bd7e-4c1f-a675-ef11a17c616d","accessors":["e09e0380-0740-4105-becc-0a4ca12e3944"],"position":"top","seriesType":"bar_stacked","showGridlines":false,"layerType":"data","xAccessor":"aac9d7d0-13a3-480a-892b-08207a787926","splitAccessor":"34919782-4546-43a5-b668-06ac934d3acd"}],"yRightExtent":{"mode":"full"},"yLeftExtent":{"mode":"full"},"axisTitlesVisibilitySettings":{"x":false,"yLeft":false,"yRight":true}},"query":{"query":"","language":"kuery"},"filters":[{"meta":{"alias":null,"negate":true,"disabled":false,"type":"exists","key":"kibana.alert.building_block_type"},"query":{"exists":{"field":"kibana.alert.building_block_type"}},"$state":{"store":"appState"}},{"meta":{"type":"phrases","key":"_index","params":[".alerts-security.alerts-default"],"alias":null,"negate":false,"disabled":false},"query":{"bool":{"should":[{"match_phrase":{"_index":".alerts-security.alerts-default"}}],"minimum_should_match":1}},"$state":{"store":"appState"}}],"datasourceStates":{"formBased":{"layers":{"eafb5cfd-bd7e-4c1f-a675-ef11a17c616d":{"columns":{"aac9d7d0-13a3-480a-892b-08207a787926":{"label":"@timestamp","dataType":"date","operationType":"date_histogram","sourceField":"@timestamp","isBucketed":true,"scale":"interval","params":{"interval":"auto"}},"e09e0380-0740-4105-becc-0a4ca12e3944":{"label":"Count of records","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___"},"34919782-4546-43a5-b668-06ac934d3acd":{"label":"Top values of kibana.alert.rule.name","dataType":"string","operationType":"terms","scale":"ordinal","sourceField":"kibana.alert.rule.name","isBucketed":true,"params":{"size":1000,"orderBy":{"type":"column","columnId":"e09e0380-0740-4105-becc-0a4ca12e3944"},"orderDirection":"desc","otherBucket":true,"missingBucket":false,"parentFormat":{"id":"terms"},"secondaryFields":[]}}},"columnOrder":["34919782-4546-43a5-b668-06ac934d3acd","aac9d7d0-13a3-480a-892b-08207a787926","e09e0380-0740-4105-becc-0a4ca12e3944"],"incompleteColumns":{}}}}},"internalReferences":[],"adHocDataViews":{}}},"enhancements":{}}},{"version":"8.8.0","type":"lens","gridData":{"x":24,"y":0,"w":24,"h":15,"i":"8bcec072-4cf2-417d-a740-2b7f34c69473"},"panelIndex":"8bcec072-4cf2-417d-a740-2b7f34c69473","embeddableConfig":{"attributes":{"title":"events","description":"","visualizationType":"lnsXY","type":"lens","references":[{"type":"index-pattern","id":"security-solution-default","name":"indexpattern-datasource-layer-63ba54b1-ca7d-4fa3-b43b-d748723abad4"}],"state":{"visualization":{"title":"Empty XY chart","legend":{"isVisible":true,"position":"left","legendSize":"xlarge"},"valueLabels":"hide","preferredSeriesType":"bar_stacked","layers":[{"layerId":"63ba54b1-ca7d-4fa3-b43b-d748723abad4","accessors":["e09e0380-0740-4105-becc-0a4ca12e3944"],"position":"top","seriesType":"bar_stacked","showGridlines":false,"layerType":"data","xAccessor":"aac9d7d0-13a3-480a-892b-08207a787926","splitAccessor":"34919782-4546-43a5-b668-06ac934d3acd"}],"yRightExtent":{"mode":"full"},"yLeftExtent":{"mode":"full"},"axisTitlesVisibilitySettings":{"x":false,"yLeft":false,"yRight":true}},"query":{"query":"","language":"kuery"},"filters":[{"meta":{"alias":null,"disabled":false,"key":"query","negate":false,"type":"custom"},"query":{"bool":{"should":[{"exists":{"field":"host.name"}}],"minimum_should_match":1}},"$state":{"store":"appState"}},{"meta":{"type":"phrases","key":"_index","params":["auditbeat-*","packetbeat-*"],"alias":null,"negate":false,"disabled":false},"query":{"bool":{"should":[{"match_phrase":{"_index":"auditbeat-*"}},{"match_phrase":{"_index":"packetbeat-*"}}],"minimum_should_match":1}},"$state":{"store":"appState"}}],"datasourceStates":{"formBased":{"layers":{"63ba54b1-ca7d-4fa3-b43b-d748723abad4":{"columns":{"aac9d7d0-13a3-480a-892b-08207a787926":{"label":"@timestamp","dataType":"date","operationType":"date_histogram","sourceField":"@timestamp","isBucketed":true,"scale":"interval","params":{"interval":"auto"}},"e09e0380-0740-4105-becc-0a4ca12e3944":{"label":"Count of records","dataType":"number","operationType":"count","isBucketed":false,"scale":"ratio","sourceField":"___records___"},"34919782-4546-43a5-b668-06ac934d3acd":{"label":"Top values of event.action","dataType":"string","operationType":"terms","scale":"ordinal","sourceField":"event.action","isBucketed":true,"params":{"size":10,"orderBy":{"type":"column","columnId":"e09e0380-0740-4105-becc-0a4ca12e3944"},"orderDirection":"desc","otherBucket":true,"missingBucket":false,"parentFormat":{"id":"terms"}}}},"columnOrder":["34919782-4546-43a5-b668-06ac934d3acd","aac9d7d0-13a3-480a-892b-08207a787926","e09e0380-0740-4105-becc-0a4ca12e3944"],"incompleteColumns":{}}}}},"internalReferences":[],"adHocDataViews":{}}},"enhancements":{}}}]',
      title: 'my alerts dashboard - 2',
      version: 1,
    },
    references: [
      {
        name: 'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
        type: 'index-pattern',
        id: 'security-solution-default',
      },
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: '46c2105e-0edd-460c-8ecf-aaf3777b0c9b:indexpattern-datasource-layer-eafb5cfd-bd7e-4c1f-a675-ef11a17c616d',
      },
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: '8bcec072-4cf2-417d-a740-2b7f34c69473:indexpattern-datasource-layer-63ba54b1-ca7d-4fa3-b43b-d748723abad4',
      },
      {
        type: 'tag',
        id: 'de7ad1f0-ccc8-11ed-9175-1b0d4269ff48',
        name: 'tag-ref-de7ad1f0-ccc8-11ed-9175-1b0d4269ff48',
      },
      {
        type: 'tag',
        id: 'edb233b0-cfc1-11ed-8380-f532c904188c',
        name: 'tag-ref-edb233b0-cfc1-11ed-8380-f532c904188c',
      },
    ],
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '8.7.0',
    updated_at: '2023-03-31T12:45:36.175Z',
    created_at: '2023-03-31T12:45:36.175Z',
    version: 'WzE5MTQyLDFd',
    score: 0,
  },
];
