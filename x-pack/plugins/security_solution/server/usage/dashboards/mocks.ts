/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getEmptyTagResponse = () => ({
  page: 1,
  per_page: 20,
  total: 0,
  saved_objects: [],
});

export const getMockTagSearchResponse = () => ({
  page: 1,
  per_page: 20,
  total: 1,
  saved_objects: [
    {
      type: 'tag',
      id: '79152660-ac4a-11ed-ae40-ff411efc2344',
      namespaces: ['default'],
      attributes: {
        name: 'Security Solution',
        description: 'Security Solution auto-generated tag',
        color: '#7835c9',
      },
      references: [],
      migrationVersion: {
        tag: '8.0.0',
      },
      coreMigrationVersion: '8.0.0',
      updated_at: '2023-02-14T09:32:17.734Z',
      created_at: '2023-02-14T09:32:17.734Z',
      version: 'WzY4OTgsMl0=',
      score: 0,
    },
  ],
});

export const getMockDashboardSearchResponse = () => ({
  page: 1,
  per_page: 20,
  total: 1,
  saved_objects: [
    {
      type: 'dashboard',
      id: '84df7db0-ac4a-11ed-ae40-ff411efc2344',
      namespaces: ['default'],
      attributes: {
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
        },
        description: '',
        timeRestore: false,
        optionsJSON:
          '{"useMargins":true,"syncColors":false,"syncCursor":true,"syncTooltips":false,"hidePanelTitles":false}',
        panelsJSON: '[]',
        title: 'My dashboard',
        version: 1,
      },
      references: [
        {
          type: 'tag',
          id: '79152660-ac4a-11ed-ae40-ff411efc2344',
          name: 'tag-ref-79152660-ac4a-11ed-ae40-ff411efc2344',
        },
      ],
      migrationVersion: {
        dashboard: '8.7.0',
      },
      coreMigrationVersion: '8.0.0',
      updated_at: '2023-02-14T09:32:37.515Z',
      created_at: '2023-02-14T09:32:37.515Z',
      version: 'WzY5MDIsMl0=',
      score: 0,
    },
  ],
});
