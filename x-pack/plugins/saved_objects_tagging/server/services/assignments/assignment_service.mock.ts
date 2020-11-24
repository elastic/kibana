/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IAssignmentService } from './assignment_service';

const getAssigmentServiceMock = () => {
  const mock: jest.Mocked<IAssignmentService> = {
    findAssignableObjects: jest.fn(),
    updateTagAssignments: jest.fn(),
  };

  return mock;
};

export const assigmentServiceMock = {
  create: getAssigmentServiceMock,
};
