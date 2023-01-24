/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectTaggingStart } from './types';
import { tagsClientMock } from './services/tags/tags_client.mock';
import { assigmentServiceMock } from './services/assignments/assignment_service.mock';

const createStartMock = () => {
  const start: jest.Mocked<SavedObjectTaggingStart> = {
    createTagClient: jest.fn(),
    createInternalAssignmentService: jest.fn(),
  };

  start.createTagClient.mockImplementation(() => tagsClientMock.create());
  start.createInternalAssignmentService.mockImplementation(() => assigmentServiceMock.create());

  return start;
};

export const savedObjectsTaggingMock = {
  createStartContract: createStartMock,
  createTagClient: tagsClientMock.create,
  createAssignmentService: assigmentServiceMock.create,
};
