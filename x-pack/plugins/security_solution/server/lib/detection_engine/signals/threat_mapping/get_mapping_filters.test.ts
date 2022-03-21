/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMappingFilters } from './get_mapping_filters';
import { ThreatMapping } from '@kbn/securitysolution-io-ts-alerting-types';

describe('getMappingFilters', () => {
  const sampleMapping: ThreatMapping = [
    {
      entries: [
        {
          field: 'source.ip',
          type: 'mapping',
          value: 'threat.indicator.ip',
        },
        {
          field: 'host.name',
          type: 'mapping',
          value: 'threat.host.name',
        },
      ],
    },
    {
      entries: [
        {
          field: 'destination.ip',
          type: 'mapping',
          value: 'threat.indicator.ip',
        },
        {
          field: 'destination.port',
          type: 'mapping',
          value: 'threat.destination.port',
        },
      ],
    },
    {
      entries: [
        {
          field: 'source.port',
          type: 'mapping',
          value: 'source.port',
        },
      ],
    },
  ];

  it('creates the expected filters', () => {
    const { eventMappingFilter, indicatorMappingFilter } = getMappingFilters(sampleMapping);

    expect(eventMappingFilter).toEqual({
      meta: {},
      query: {
        bool: {
          should: [
            {
              bool: {
                must: [
                  {
                    exists: { field: 'source.ip' },
                  },
                  {
                    exists: { field: 'host.name' },
                  },
                ],
              },
            },
            {
              bool: {
                must: [
                  {
                    exists: { field: 'destination.ip' },
                  },
                  {
                    exists: { field: 'destination.port' },
                  },
                ],
              },
            },
            {
              bool: {
                must: [
                  {
                    exists: { field: 'source.port' },
                  },
                ],
              },
            },
          ],
        },
      },
    });

    expect(indicatorMappingFilter).toEqual({
      meta: {},
      query: {
        bool: {
          should: [
            {
              bool: {
                must: [
                  {
                    exists: { field: 'threat.indicator.ip' },
                  },
                  {
                    exists: { field: 'threat.host.name' },
                  },
                ],
              },
            },
            {
              bool: {
                must: [
                  {
                    exists: { field: 'threat.indicator.ip' },
                  },
                  {
                    exists: { field: 'threat.destination.port' },
                  },
                ],
              },
            },
            {
              bool: {
                must: [
                  {
                    exists: { field: 'source.port' },
                  },
                ],
              },
            },
          ],
        },
      },
    });
  });
});
