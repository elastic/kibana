/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInfraDeprecationsFactory } from './deprecations';

describe('Infra plugin deprecations', () => {
  describe('Source configuration deprecations', () => {
    test('returns no deprecations when all fields are set to the default values', async () => {
      const sources = {
        getAllSourceConfigurations: () => [
          {
            configuration: {
              name: 'Default',
              fields: {
                timestamp: '@timestamp',
                tiebreaker: '_doc',
                container: 'container.id',
                host: 'host.name',
                pod: 'kubernetes.pod.uid',
              },
            },
          },
          {
            configuration: {
              name: 'Alternate',
              fields: {
                timestamp: '@timestamp',
                tiebreaker: '_doc',
                container: 'container.id',
                host: 'host.name',
                pod: 'kubernetes.pod.uid',
              },
            },
          },
        ],
      };
      const getDeprecations = getInfraDeprecationsFactory(sources as any);
      const deprecations = await getDeprecations({} as any);
      expect(deprecations.length).toBe(0);
    });
  });
  test('returns expected deprecations when some fields are not set to default values in one or more source configurations', async () => {
    const sources = {
      getAllSourceConfigurations: () => [
        {
          configuration: {
            name: 'Default',
            fields: {
              timestamp: 'not-@timestamp',
              tiebreaker: '_doc',
              container: 'not-container.id',
              host: 'host.name',
              pod: 'not-kubernetes.pod.uid',
            },
          },
        },
        {
          configuration: {
            name: 'Alternate',
            fields: {
              timestamp: 'not-@timestamp',
              tiebreaker: 'not-_doc',
              container: 'container.id',
              host: 'not-host.name',
              pod: 'kubernetes.pod.uid',
            },
          },
        },
      ],
    };
    const getDeprecations = getInfraDeprecationsFactory(sources as any);
    const deprecations = await getDeprecations({} as any);
    expect(deprecations.length).toBe(5);
    expect(
      deprecations.map((d) =>
        d.title.replace(/Source configuration field "(.*)" is deprecated./, '$1')
      )
    ).toEqual(
      expect.arrayContaining(['timestamp', 'tiebreaker', 'container ID', 'host name', 'pod ID'])
    );
  });
});
