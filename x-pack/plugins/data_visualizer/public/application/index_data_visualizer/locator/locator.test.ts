/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexDataVisualizerLocatorDefinition } from './locator';

describe('Index data visualizer locator', () => {
  const definition = new IndexDataVisualizerLocatorDefinition();

  it('should generate valid URL for the Index Data Visualizer Viewer page with global settings', async () => {
    const location = await definition.getLocation({
      dataViewId: '3da93760-e0af-11ea-9ad3-3bcfc330e42a',
      timeRange: {
        from: 'now-30m',
        to: 'now',
      },
      refreshInterval: { pause: false, value: 300 },
    });

    expect(location).toMatchObject({
      app: 'ml',
      path: '/jobs/new_job/datavisualizer?index=3da93760-e0af-11ea-9ad3-3bcfc330e42a&_a=(DATA_VISUALIZER_INDEX_VIEWER:())&_g=(refreshInterval:(pause:!f,value:300),time:(from:now-30m,to:now))',
      state: {},
    });
  });

  it('should prioritize savedSearchId even when data view id is available', async () => {
    const location = await definition.getLocation({
      dataViewId: '3da93760-e0af-11ea-9ad3-3bcfc330e42a',
      savedSearchId: '45014020-dffa-11eb-b120-a105fbbe93b3',
    });

    expect(location).toMatchObject({
      app: 'ml',
      path: '/jobs/new_job/datavisualizer?savedSearchId=45014020-dffa-11eb-b120-a105fbbe93b3&_a=(DATA_VISUALIZER_INDEX_VIEWER:())&_g=()',
      state: {},
    });
  });

  it('should generate valid URL with field names and field types', async () => {
    const location = await definition.getLocation({
      dataViewId: '3da93760-e0af-11ea-9ad3-3bcfc330e42a',
      visibleFieldNames: ['@timestamp', 'responsetime'],
      visibleFieldTypes: ['number'],
    });

    expect(location).toMatchObject({
      app: 'ml',
      path: "/jobs/new_job/datavisualizer?index=3da93760-e0af-11ea-9ad3-3bcfc330e42a&_a=(DATA_VISUALIZER_INDEX_VIEWER:(visibleFieldNames:!('@timestamp',responsetime),visibleFieldTypes:!(number)))&_g=()",
    });
  });

  it('should generate valid URL with KQL query', async () => {
    const location = await definition.getLocation({
      dataViewId: '3da93760-e0af-11ea-9ad3-3bcfc330e42a',
      query: {
        searchQuery: {
          bool: {
            should: [
              {
                match: {
                  region: 'ap-northwest-1',
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        searchString: 'region : ap-northwest-1',
        searchQueryLanguage: 'kuery',
      },
    });

    expect(location).toMatchObject({
      app: 'ml',
      path: "/jobs/new_job/datavisualizer?index=3da93760-e0af-11ea-9ad3-3bcfc330e42a&_a=(DATA_VISUALIZER_INDEX_VIEWER:(searchQuery:(bool:(minimum_should_match:1,should:!((match:(region:ap-northwest-1))))),searchQueryLanguage:kuery,searchString:'region : ap-northwest-1'))&_g=()",
      state: {},
    });
  });

  it('should generate valid URL with Lucene query', async () => {
    const location = await definition.getLocation({
      dataViewId: '3da93760-e0af-11ea-9ad3-3bcfc330e42a',
      query: {
        searchQuery: {
          query_string: {
            query: 'region: ap-northwest-1',
            analyze_wildcard: true,
          },
        },
        searchString: 'region : ap-northwest-1',
        searchQueryLanguage: 'lucene',
      },
    });

    expect(location).toMatchObject({
      app: 'ml',
      path: "/jobs/new_job/datavisualizer?index=3da93760-e0af-11ea-9ad3-3bcfc330e42a&_a=(DATA_VISUALIZER_INDEX_VIEWER:(searchQuery:(query_string:(analyze_wildcard:!t,query:'region: ap-northwest-1')),searchQueryLanguage:lucene,searchString:'region : ap-northwest-1'))&_g=()",
      state: {},
    });
  });
});
