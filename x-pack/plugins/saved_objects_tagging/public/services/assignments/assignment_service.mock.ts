/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ITagAssignmentService } from './assignment_service';

const createAssignmentServiceMock = () => {
  const mock: jest.Mocked<ITagAssignmentService> = {
    findAssignableObjects: jest.fn(),
    updateTagAssignments: jest.fn(),
    getAssignableTypes: jest.fn(),
  };

  return mock;
};

export const assignmentServiceMock = {
  create: createAssignmentServiceMock,
};
