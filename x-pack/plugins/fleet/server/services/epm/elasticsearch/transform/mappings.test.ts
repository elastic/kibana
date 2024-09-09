/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadMappingForTransform } from './mappings';

describe('loadMappingForTransform', () => {
  it('should return a mappings without properties if there is no fields resource', () => {
    const fields = loadMappingForTransform(
      {
        packageInfo: {} as any,
        assetsMap: new Map(),
        paths: [],
      },
      'test'
    );

    expect(fields).toEqual({ properties: {} });
  });

  it('should merge shallow mapping without properties if there is no fields resource', () => {
    const fields = loadMappingForTransform(
      {
        packageInfo: {} as any,
        assetsMap: new Map([
          [
            '/package/ti_opencti/2.1.0/elasticsearch/transform/latest_ioc/fields/ecs.yml',
            Buffer.from(
              `
- description: Description of the threat feed in a UI friendly format.
  name: threat.feed.description
  type: keyword
- description: The name of the threat feed in UI friendly format.
  name: threat.feed.name
  type: keyword`
            ),
          ],
          [
            '/package/ti_opencti/2.1.0/elasticsearch/transform/latest_ioc/fields/ecs-extra.yml',
            Buffer.from(
              `
- description: The display name indicator in an UI friendly format
  level: extended
  name: threat.indicator.name
  type: keyword`
            ),
          ],
        ]),
        paths: [
          '/package/ti_opencti/2.1.0/elasticsearch/transform/latest_ioc/fields/ecs.yml',
          '/package/ti_opencti/2.1.0/elasticsearch/transform/latest_ioc/fields/ecs-extra.yml',
        ],
      },
      'latest_ioc'
    );

    expect(fields).toMatchInlineSnapshot(`
      Object {
        "properties": Object {
          "threat": Object {
            "properties": Object {
              "feed": Object {
                "properties": Object {
                  "description": Object {
                    "ignore_above": 1024,
                    "type": "keyword",
                  },
                  "name": Object {
                    "ignore_above": 1024,
                    "type": "keyword",
                  },
                },
              },
              "indicator": Object {
                "properties": Object {
                  "name": Object {
                    "ignore_above": 1024,
                    "type": "keyword",
                  },
                },
              },
            },
          },
        },
      }
    `);
  });
});
