/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { of } from 'rxjs';

import type { SpacesManager } from './spaces_manager';
import type { Space } from '../../common';

function createSpacesManagerMock() {
  return {
    onActiveSpaceChange$: of(undefined) as unknown as Observable<Space>,
    getSpaces: jest.fn().mockResolvedValue([]),
    getSpace: jest.fn().mockResolvedValue(undefined),
    getActiveSpace: jest.fn().mockResolvedValue(undefined),
    createSpace: jest.fn().mockResolvedValue(undefined),
    updateSpace: jest.fn().mockResolvedValue(undefined),
    deleteSpace: jest.fn().mockResolvedValue(undefined),
    disableLegacyUrlAliases: jest.fn().mockResolvedValue(undefined),
    copySavedObjects: jest.fn().mockResolvedValue(undefined),
    getShareableReferences: jest.fn().mockResolvedValue(undefined),
    updateSavedObjectsSpaces: jest.fn().mockResolvedValue(undefined),
    resolveCopySavedObjectsErrors: jest.fn().mockResolvedValue(undefined),
    getShareSavedObjectPermissions: jest.fn().mockResolvedValue(undefined),
    getContentForSpace: jest.fn().mockResolvedValue({ summary: [], total: 0 }),
    getRolesForSpace: jest.fn().mockResolvedValue([]),
    redirectToSpaceSelector: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<SpacesManager>;
}

export const spacesManagerMock = {
  create: createSpacesManagerMock,
};
