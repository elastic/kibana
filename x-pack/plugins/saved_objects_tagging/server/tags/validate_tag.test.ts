/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  validateTagColorMock,
  validateTagNameMock,
  validateTagDescriptionMock,
} from './validate_tag.test.mocks';

import { TagAttributes } from '../../common/types';
import { validateTag } from './validate_tag';

const createAttributes = (parts: Partial<TagAttributes> = {}): TagAttributes => ({
  name: 'a-tag',
  description: 'some-desc',
  color: '#FF00CC',
  ...parts,
});

describe('validateTag', () => {
  beforeEach(() => {
    validateTagNameMock.mockReset();
    validateTagColorMock.mockReset();
    validateTagDescriptionMock.mockReset();
  });

  it('calls `validateTagName` with attributes.name', () => {
    const attributes = createAttributes();

    validateTag(attributes);

    expect(validateTagNameMock).toHaveBeenCalledTimes(1);
    expect(validateTagNameMock).toHaveBeenCalledWith(attributes.name);
  });

  it('returns the error from `validateTagName` in `errors.name`', () => {
    const nameError = 'invalid name';
    const attributes = createAttributes();
    validateTagNameMock.mockReturnValue(nameError);

    const validation = validateTag(attributes);

    expect(validation.errors.name).toBe(nameError);
  });

  it('calls `validateTagColor` with attributes.color', () => {
    const attributes = createAttributes();

    validateTag(attributes);

    expect(validateTagColorMock).toHaveBeenCalledTimes(1);
    expect(validateTagColorMock).toHaveBeenCalledWith(attributes.color);
  });

  it('returns the error from `validateTagColor` in `errors.color`', () => {
    const nameError = 'invalid color';
    const attributes = createAttributes();
    validateTagColorMock.mockReturnValue(nameError);

    const validation = validateTag(attributes);

    expect(validation.errors.color).toBe(nameError);
  });

  it('returns `valid: true` if no field has error', () => {
    const attributes = createAttributes();
    validateTagNameMock.mockReturnValue(undefined);
    validateTagColorMock.mockReturnValue(undefined);

    const validation = validateTag(attributes);
    expect(validation.valid).toBe(true);
  });

  it('calls `validateTagDescription` with attributes.description', () => {
    const attributes = createAttributes();

    validateTag(attributes);

    expect(validateTagDescriptionMock).toHaveBeenCalledTimes(1);
    expect(validateTagDescriptionMock).toHaveBeenCalledWith(attributes.description);
  });

  it('returns the error from `validateTagDescription` in `errors.description`', () => {
    const descError = 'invalid description';
    const attributes = createAttributes();
    validateTagDescriptionMock.mockReturnValue(descError);

    const validation = validateTag(attributes);

    expect(validation.errors.description).toBe(descError);
  });

  it('returns `valid: false` if any field has error', () => {
    const attributes = createAttributes();
    validateTagNameMock.mockReturnValue('invalid name');
    validateTagColorMock.mockReturnValue(undefined);
    validateTagDescriptionMock.mockReturnValue(undefined);

    let validation = validateTag(attributes);
    expect(validation.valid).toBe(false);

    validateTagNameMock.mockReturnValue(undefined);
    validateTagColorMock.mockReturnValue('invalid color');
    validateTagDescriptionMock.mockReturnValue(undefined);

    validation = validateTag(attributes);
    expect(validation.valid).toBe(false);

    validateTagNameMock.mockReturnValue(undefined);
    validateTagColorMock.mockReturnValue(undefined);
    validateTagDescriptionMock.mockReturnValue('invalid desc');

    validation = validateTag(attributes);
    expect(validation.valid).toBe(false);
  });
});
