/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { GraphWorkspaceSavedObject } from '../types';
import { saveSavedWorkspace } from './saved_workspace_utils';

const core = coreMock.createStart();

describe('saved_workspace_utils', () => {
  describe('saveSavedWorkspace', () => {
    it('should delete the savedWorkspace id and set isSaving to true immediately when copyOnSave is true', async () => {
      const savedWorkspace = {
        id: '123',
        title: 'my workspace',
        lastSavedTitle: 'my workspace',
        migrationVersion: {},
        wsState: '{ "indexPattern": "my-index-pattern" }',
        getEsType: () => 'graph-workspace',
        copyOnSave: true,
        isSaving: false,
      } as GraphWorkspaceSavedObject;
      const promise = saveSavedWorkspace(
        savedWorkspace,
        {},
        {
          savedObjectsClient: {
            ...core.savedObjects.client,
            find: jest.fn().mockResolvedValue({ savedObjects: [] }),
            create: jest.fn().mockResolvedValue({ id: '456' }),
          },
          overlays: core.overlays,
        }
      );
      expect(savedWorkspace.id).toBe(undefined);
      expect(savedWorkspace.isSaving).toBe(true);
      const id = await promise;
      expect(id).toBe('456');
      expect(savedWorkspace.id).toBe('456');
      expect(savedWorkspace.isSaving).toBe(false);
    });
  });
});
