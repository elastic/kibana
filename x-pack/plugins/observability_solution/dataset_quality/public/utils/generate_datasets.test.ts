/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { indexNameToDataStreamParts } from '../../common/utils';
import { DataStreamStat } from '../../common/data_streams_stats/data_stream_stat';
import { Integration } from '../../common/data_streams_stats/integration';
import { generateDatasets } from './generate_datasets';

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

  const dataStreamStats: DataStreamStat[] = [
    {
      name: 'system.application',
      title: 'system.application',
      type: 'logs',
      namespace: 'default',
      lastActivity: 1712911241117,
      size: '82.1kb',
      sizeBytes: 84160,
      rawName: 'logs-system.application-default',
      degradedDocs: {
        percentage: 0,
        count: 0,
      },
    },
    {
      name: 'synth',
      title: 'synth',
      type: 'logs',
      namespace: 'default',
      lastActivity: 1712911241117,
      rawName: 'logs-synth-default',
      size: '62.5kb',
      sizeBytes: 64066,
      degradedDocs: {
        percentage: 0,
        count: 0,
      },
    },
  ];

  const degradedDocs = [
    {
      dataset: 'logs-system.application-default',
      percentage: 0,
      count: 0,
    },
    {
      dataset: 'logs-synth-default',
      percentage: 11.320754716981131,
      count: 6,
    },
  ];

  it('merges integrations information with dataStreamStats', () => {
    const datasets = generateDatasets(dataStreamStats, undefined, integrations);

    expect(datasets).toEqual([
      {
        ...dataStreamStats[0],
        title: integrations[0].datasets[dataStreamStats[0].name],
        integration: integrations[0],
      },
      {
        ...dataStreamStats[1],
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
        namespace: indexNameToDataStreamParts(degradedDocs[0].dataset).namespace,
        title:
          integrations[0].datasets[indexNameToDataStreamParts(degradedDocs[0].dataset).dataset],
        integration: integrations[0],
        degradedDocs: {
          percentage: degradedDocs[0].percentage,
          count: degradedDocs[0].count,
        },
      },
      {
        rawName: degradedDocs[1].dataset,
        name: indexNameToDataStreamParts(degradedDocs[1].dataset).dataset,
        type: indexNameToDataStreamParts(degradedDocs[1].dataset).type,
        lastActivity: undefined,
        size: undefined,
        sizeBytes: undefined,
        namespace: indexNameToDataStreamParts(degradedDocs[1].dataset).namespace,
        title: indexNameToDataStreamParts(degradedDocs[1].dataset).dataset,
        integration: undefined,
        degradedDocs: {
          percentage: degradedDocs[1].percentage,
          count: degradedDocs[1].count,
        },
      },
    ]);
  });

  it('merges integrations information with dataStreamStats and degradedDocs', () => {
    const datasets = generateDatasets(dataStreamStats, degradedDocs, integrations);

    expect(datasets).toEqual([
      {
        ...dataStreamStats[0],
        title: integrations[0].datasets[dataStreamStats[0].name],
        integration: integrations[0],
        degradedDocs: {
          percentage: degradedDocs[0].percentage,
          count: degradedDocs[0].count,
        },
      },
      {
        ...dataStreamStats[1],
        degradedDocs: {
          percentage: degradedDocs[1].percentage,
          count: degradedDocs[1].count,
        },
      },
    ]);
  });

  it('returns an empty array if no valid object is provided', () => {
    expect(generateDatasets(undefined, undefined, integrations)).toEqual([]);
  });
});
