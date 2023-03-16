/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { SECURITY_INTEGRATIONS_TAG_NAME, SECURITY_TAG_NAME } from '../../../../common/constants';
import {
  createSecuritySolutionTag,
  getSecurityDashboards,
  getSecuritySolutionTagId,
  SECURITY_TAG_DESCRIPTION,
} from './utils';

const TAG_ID = 'securityTagId';
const DASHBOARD_ID = 'securityDashboardId';
const DEFAULT_TAGS_RESPONSE = [
  {
    id: TAG_ID,
    attributes: { name: SECURITY_TAG_NAME },
  },
  {
    id: `${TAG_ID}_2`,
    attributes: { name: `${SECURITY_TAG_NAME}_2` },
  },
];
const DEFAULT_DASHBOARDS_RESPONSE = [
  {
    id: DASHBOARD_ID,
    attributes: { name: 'Some dashboard name' },
  },
];

const mockSavedObjectsFind = jest.fn(async ({ type }: { type: 'tag' | 'dashboard' }) => ({
  savedObjects: type === 'tag' ? DEFAULT_TAGS_RESPONSE : DEFAULT_DASHBOARDS_RESPONSE,
}));
const savedObjectsClient = {
  find: mockSavedObjectsFind,
} as unknown as SavedObjectsClientContract;

const mockTagsClientCreate = jest.fn(async (_: unknown) => DEFAULT_TAGS_RESPONSE[0]);
const tagsClient = {
  create: (req: unknown) => mockTagsClientCreate(req),
} as unknown as SavedObjectsTaggingApi['client'];

describe('dashboards utils', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSecuritySolutionTagId', () => {
    it('should call saved objects find with security tag name', async () => {
      await getSecuritySolutionTagId(savedObjectsClient);

      expect(mockSavedObjectsFind).toHaveBeenCalledWith({
        type: 'tag',
        search: `"${SECURITY_TAG_NAME}"`,
        searchFields: ['name'],
      });
    });

    it('should find saved object with security tag name', async () => {
      const result = await getSecuritySolutionTagId(savedObjectsClient);
      expect(result).toEqual(TAG_ID);
    });

    it('should not find saved object with wrong security tag name', async () => {
      mockSavedObjectsFind.mockResolvedValueOnce({ savedObjects: [DEFAULT_TAGS_RESPONSE[1]] });
      const result = await getSecuritySolutionTagId(savedObjectsClient);

      expect(result).toBeUndefined();
    });
  });

  describe('createSecuritySolutionTag', () => {
    it('should call saved objects find with security tag name', async () => {
      await createSecuritySolutionTag(tagsClient);

      expect(mockTagsClientCreate).toHaveBeenCalledWith({
        name: SECURITY_TAG_NAME,
        description: SECURITY_TAG_DESCRIPTION,
        color: expect.any(String),
      });
    });

    it('should return the created tag saved object', async () => {
      const result = await createSecuritySolutionTag(tagsClient);
      expect(result).toEqual({ id: TAG_ID, attributes: { name: SECURITY_TAG_NAME } });
    });
  });

  describe('getSecurityDashboards', () => {
    it('should call both saved objects types to find with security dashboards', async () => {
      await getSecurityDashboards(savedObjectsClient);

      expect(mockSavedObjectsFind).toHaveBeenCalledWith({
        type: 'tag',
        search: `"${SECURITY_TAG_NAME}" | "${SECURITY_INTEGRATIONS_TAG_NAME}"`,
        searchFields: ['name'],
      });
      expect(mockSavedObjectsFind).toHaveBeenCalledWith({
        type: 'dashboard',
        hasReference: [{ id: TAG_ID, type: 'tag' }],
      });
    });

    it('should return dashboard saved objects with security tag names', async () => {
      const result = await getSecurityDashboards(savedObjectsClient);
      expect(result).toEqual(DEFAULT_DASHBOARDS_RESPONSE);
    });
  });
});
