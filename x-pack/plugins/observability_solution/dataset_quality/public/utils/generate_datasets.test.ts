/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { indexNameToDataStreamParts } from '../../common/utils';
import { Integration } from '../../common/data_streams_stats/integration';
import { generateDatasets } from './generate_datasets';
import { DataStreamStatType } from '../../common/data_streams_stats/types';

describe('generateDatasets', () => {
  const integrations: Integration[] = [
    {
      name: 'system',
      title: 'System',
      version: '1.54.0',
      datasets: {
        'system.application': 'Windows Application Events',
        'system.auth': 'System auth logs',
        'system.security': 'Security logs',
        'system.syslog': 'System syslog logs',
        'system.system': 'Windows System Events',
      },
    },
    {
      name: 'custom',
      title: 'Custom',
      version: '1.0.0',
      datasets: {
        custom: 'Custom',
      },
    },
  ];

  const dataStreamStats: DataStreamStatType[] = [
    {
      name: 'logs-system.application-default',
      lastActivity: 1712911241117,
      size: '82.1kb',
      sizeBytes: 84160,
      integration: 'system',
      userPrivileges: {
        canMonitor: true,
      },
    },
    {
      name: 'logs-synth-default',
      lastActivity: 1712911241117,
      size: '62.5kb',
      sizeBytes: 64066,
      userPrivileges: {
        canMonitor: true,
      },
    },
  ];

  const degradedDocs = [
    {
      dataset: 'logs-system.application-default',
      percentage: 0,
      count: 0,
      docsCount: 0,
      quality: 'good' as const,
    },
    {
      dataset: 'logs-synth-default',
      percentage: 11.320754716981131,
      count: 6,
      docsCount: 0,
      quality: 'poor' as const,
    },
  ];

  it('merges integrations information with dataStreamStats', () => {
    const datasets = generateDatasets(dataStreamStats, undefined, integrations);

    expect(datasets).toEqual([
      {
        ...dataStreamStats[0],
        name: indexNameToDataStreamParts(dataStreamStats[0].name).dataset,
        namespace: indexNameToDataStreamParts(dataStreamStats[0].name).namespace,
        title:
          integrations[0].datasets[indexNameToDataStreamParts(dataStreamStats[0].name).dataset],
        type: indexNameToDataStreamParts(dataStreamStats[0].name).type,
        rawName: dataStreamStats[0].name,
        integration: integrations[0],
        degradedDocs: {
          percentage: degradedDocs[0].percentage,
          count: degradedDocs[0].count,
          docsCount: degradedDocs[0].docsCount,
          quality: degradedDocs[0].quality,
        },
      },
      {
        ...dataStreamStats[1],
        name: indexNameToDataStreamParts(dataStreamStats[1].name).dataset,
        namespace: indexNameToDataStreamParts(dataStreamStats[1].name).namespace,
        title: indexNameToDataStreamParts(dataStreamStats[1].name).dataset,
        type: indexNameToDataStreamParts(dataStreamStats[1].name).type,
        rawName: dataStreamStats[1].name,
        degradedDocs: {
          count: 0,
          percentage: 0,
          docsCount: 0,
          quality: 'good',
        },
      },
    ]);
  });

  it('merges integrations information with degradedDocs', () => {
    const datasets = generateDatasets(undefined, degradedDocs, integrations);

    expect(datasets).toEqual([
      {
        rawName: degradedDocs[0].dataset,
        name: indexNameToDataStreamParts(degradedDocs[0].dataset).dataset,
        type: indexNameToDataStreamParts(degradedDocs[0].dataset).type,
        lastActivity: undefined,
        size: undefined,
        sizeBytes: undefined,
        userPrivileges: undefined,
        namespace: indexNameToDataStreamParts(degradedDocs[0].dataset).namespace,
        title:
          integrations[0].datasets[indexNameToDataStreamParts(degradedDocs[0].dataset).dataset],
        integration: integrations[0],
        degradedDocs: {
          percentage: degradedDocs[0].percentage,
          count: degradedDocs[0].count,
          docsCount: degradedDocs[0].docsCount,
          quality: degradedDocs[0].quality,
        },
      },
      {
        rawName: degradedDocs[1].dataset,
        name: indexNameToDataStreamParts(degradedDocs[1].dataset).dataset,
        type: indexNameToDataStreamParts(degradedDocs[1].dataset).type,
        lastActivity: undefined,
        size: undefined,
        sizeBytes: undefined,
        userPrivileges: undefined,
        namespace: indexNameToDataStreamParts(degradedDocs[1].dataset).namespace,
        title: indexNameToDataStreamParts(degradedDocs[1].dataset).dataset,
        integration: undefined,
        degradedDocs: {
          percentage: degradedDocs[1].percentage,
          count: degradedDocs[1].count,
          docsCount: degradedDocs[1].docsCount,
          quality: degradedDocs[1].quality,
        },
      },
    ]);
  });

  it('merges integrations information with dataStreamStats and degradedDocs', () => {
    const datasets = generateDatasets(dataStreamStats, degradedDocs, integrations);

    expect(datasets).toEqual([
      {
        ...dataStreamStats[0],
        name: indexNameToDataStreamParts(dataStreamStats[0].name).dataset,
        namespace: indexNameToDataStreamParts(dataStreamStats[0].name).namespace,
        title:
          integrations[0].datasets[indexNameToDataStreamParts(dataStreamStats[0].name).dataset],
        type: indexNameToDataStreamParts(dataStreamStats[0].name).type,
        rawName: dataStreamStats[0].name,
        integration: integrations[0],
        degradedDocs: {
          percentage: degradedDocs[0].percentage,
          count: degradedDocs[0].count,
          docsCount: degradedDocs[0].docsCount,
          quality: degradedDocs[0].quality,
        },
      },
      {
        ...dataStreamStats[1],
        name: indexNameToDataStreamParts(dataStreamStats[1].name).dataset,
        namespace: indexNameToDataStreamParts(dataStreamStats[1].name).namespace,
        title: indexNameToDataStreamParts(dataStreamStats[1].name).dataset,
        type: indexNameToDataStreamParts(dataStreamStats[1].name).type,
        rawName: dataStreamStats[1].name,
        degradedDocs: {
          percentage: degradedDocs[1].percentage,
          count: degradedDocs[1].count,
          docsCount: degradedDocs[1].docsCount,
          quality: degradedDocs[1].quality,
        },
      },
    ]);
  });

  it('merges integration information with dataStreamStats when dataset is not an integration default one', () => {
    const dataset = 'logs-system.custom-default';

    const nonDefaultDataset = {
      name: dataset,
      lastActivity: 1712911241117,
      size: '82.1kb',
      sizeBytes: 84160,
      integration: 'system',
      userPrivileges: {
        canMonitor: true,
      },
    };

    const datasets = generateDatasets([nonDefaultDataset], undefined, integrations);

    expect(datasets).toEqual([
      {
        ...nonDefaultDataset,
        title: indexNameToDataStreamParts(dataset).dataset,
        name: indexNameToDataStreamParts(dataset).dataset,
        namespace: indexNameToDataStreamParts(dataset).namespace,
        type: indexNameToDataStreamParts(dataset).type,
        rawName: nonDefaultDataset.name,
        integration: integrations[0],
        degradedDocs: {
          count: 0,
          percentage: 0,
          docsCount: 0,
          quality: 'good',
        },
      },
    ]);
  });

  it('returns an empty array if no valid object is provided', () => {
    expect(generateDatasets(undefined, undefined, integrations)).toEqual([]);
  });
});
