/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const validateTagNameMock = jest.fn();
export const validateTagColorMock = jest.fn();
export const validateTagDescriptionMock = jest.fn();

jest.doMock('../../common/validation', () => ({
  validateTagName: validateTagNameMock,
  validateTagColor: validateTagColorMock,
  validateTagDescription: validateTagDescriptionMock,
}));
