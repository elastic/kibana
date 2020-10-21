/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const createCaseServiceMock = () => ({
  deleteCase: jest.fn(),
  deleteComment: jest.fn(),
  findCases: jest.fn(),
  getAllCaseComments: jest.fn(),
  getCase: jest.fn(),
  getCases: jest.fn(),
  getComment: jest.fn(),
  getTags: jest.fn(),
  getReporters: jest.fn(),
  getUser: jest.fn(),
  postNewCase: jest.fn(),
  postNewComment: jest.fn(),
  patchCase: jest.fn(),
  patchCases: jest.fn(),
  patchComment: jest.fn(),
  patchComments: jest.fn(),
});

export const createConfigureServiceMock = () => ({
  delete: jest.fn(),
  get: jest.fn(),
  find: jest.fn(),
  patch: jest.fn(),
  post: jest.fn(),
});

export const createUserActionServiceMock = () => ({
  getUserActions: jest.fn(),
  postUserActions: jest.fn(),
});
