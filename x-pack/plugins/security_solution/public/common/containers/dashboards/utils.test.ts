/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/public';
import { getSecurityTagId, SECURITY_TAG_NAME } from './utils';

const TAG_ID = 'securityTagId';
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

const mockSavedObjectsFind = jest.fn(async () => ({ savedObjects: DEFAULT_TAGS_RESPONSE }));
const savedObjectsClient = {
  find: mockSavedObjectsFind,
} as unknown as SavedObjectsClientContract;

describe('dashboards utils', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSecurityTagId', () => {
    it('should call saved objects find with security tag name', async () => {
      await getSecurityTagId(savedObjectsClient);

      expect(mockSavedObjectsFind).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'tag', search: SECURITY_TAG_NAME, searchFields: ['name'] })
      );
    });

    it('should find saved object with security tag name', async () => {
      const result = await getSecurityTagId(savedObjectsClient);

      expect(result).toEqual(TAG_ID);
    });

    it('should not find saved object with wrong security tag name', async () => {
      mockSavedObjectsFind.mockResolvedValueOnce({ savedObjects: [DEFAULT_TAGS_RESPONSE[1]] });
      const result = await getSecurityTagId(savedObjectsClient);

      expect(result).toBeUndefined();
    });
  });

  describe('createSecurityTag', () => {
    it('should call saved objects find with security tag name', async () => {
      await getSecurityTagId(savedObjectsClient);

      expect(mockSavedObjectsFind).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'tag', search: SECURITY_TAG_NAME, searchFields: ['name'] })
      );
    });

    it('should find saved object with security tag name', async () => {
      const result = await getSecurityTagId(savedObjectsClient);

      expect(result).toEqual(TAG_ID);
    });

    it('should not find saved object with wrong security tag name', async () => {
      mockSavedObjectsFind.mockResolvedValueOnce({ savedObjects: [DEFAULT_TAGS_RESPONSE[1]] });
      const result = await getSecurityTagId(savedObjectsClient);

      expect(result).toBeUndefined();
    });
  });
});
