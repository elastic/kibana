/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import {
  getSecuritySolutionTags as mockGetSecuritySolutionTags,
  getSecuritySolutionDashboards as mockGetSecuritySolutionDashboards,
} from './api';
import { getSecurityDashboards, getSecurityTagIds } from './utils';

jest.mock('./api');
const mockHttp = {} as unknown as HttpSetup;

describe('dashboards utils', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSecurityTagIds', () => {
    it('should call getSecuritySolutionTags with http', async () => {
      await getSecurityTagIds(mockHttp);

      expect(mockGetSecuritySolutionTags).toHaveBeenCalledWith(
        expect.objectContaining({ http: mockHttp })
      );
    });

    it('should find saved objects Ids with security tags', async () => {
      const result = await getSecurityTagIds(mockHttp);

      expect(result).toMatchInlineSnapshot(`
        Array [
          "securityTagId",
        ]
      `);
    });
  });

  describe('getSecurityDashboards', () => {
    it('should call getSecuritySolutionDashboards with http', async () => {
      await getSecurityDashboards(mockHttp);

      expect(mockGetSecuritySolutionDashboards).toHaveBeenCalledWith(
        expect.objectContaining({ http: mockHttp })
      );
    });

    it('should find saved objects with security tags', async () => {
      const result = await getSecurityDashboards(mockHttp);

      expect(result).toMatchInlineSnapshot(`
        Array [
          Object {
            "attributes": Object {
              "description": "Summary of Linux kernel audit events.",
              "title": "[Auditbeat Auditd] Overview ECS",
              "version": 1,
            },
            "coreMigrationVersion": "8.8.0",
            "created_at": "2023-04-03T11:20:50.603Z",
            "id": "c0ac2c00-c1c0-11e7-8995-936807a28b16-ecs",
            "namespaces": Array [
              "default",
            ],
            "references": Array [
              Object {
                "id": "ba964280-d211-11ed-890b-153ddf1a08e9",
                "name": "tag-ref-ba964280-d211-11ed-890b-153ddf1a08e9",
                "type": "tag",
              },
            ],
            "score": 0,
            "type": "dashboard",
            "typeMigrationVersion": "8.7.0",
            "updated_at": "2023-04-03T11:38:00.902Z",
            "version": "WzE4NzQsMV0=",
          },
        ]
      `);
    });
  });
});
