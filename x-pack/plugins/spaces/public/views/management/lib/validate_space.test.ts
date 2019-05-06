/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpaceValidator } from './validate_space';

let validator: SpaceValidator;

describe('validateSpaceName', () => {
  beforeEach(() => {
    validator = new SpaceValidator({
      shouldValidate: true,
    });
  });

  test('it allows a name with special characters', () => {
    const space = {
      id: '',
      name: 'This is the name of my Space! @#$%^&*()_+-=',
    };

    expect(validator.validateSpaceName(space)).toEqual({ isInvalid: false });
  });

  test('it requires a non-empty value', () => {
    const space = {
      id: '',
      name: '',
    };

    expect(validator.validateSpaceName(space)).toEqual({
      isInvalid: true,
      error: `Name is required.`,
    });
  });

  test('it cannot be composed entirely of whitespace', () => {
    const space = {
      id: '',
      name: '         ',
    };

    expect(validator.validateSpaceName(space)).toEqual({
      isInvalid: true,
      error: `Name is required.`,
    });
  });

  test('it cannot exceed 1024 characters', () => {
    const space = {
      id: '',
      name: new Array(1026).join('A'),
    };

    expect(validator.validateSpaceName(space)).toEqual({
      isInvalid: true,
      error: `Name must not exceed 1024 characters.`,
    });
  });
});

describe('validateSpaceDescription', () => {
  test('is optional', () => {
    const space = {
      id: '',
      name: '',
    };

    expect(validator.validateSpaceDescription(space)).toEqual({ isInvalid: false });
  });

  test('it cannot exceed 2000 characters', () => {
    const space = {
      id: '',
      name: '',
      description: new Array(2002).join('A'),
    };

    expect(validator.validateSpaceDescription(space)).toEqual({
      isInvalid: true,
      error: `Description must not exceed 2000 characters.`,
    });
  });
});

describe('validateURLIdentifier', () => {
  test('it does not validate reserved spaces', () => {
    const space = {
      id: '',
      name: '',
      _reserved: true,
    };

    expect(validator.validateURLIdentifier(space)).toEqual({ isInvalid: false });
  });

  test('it requires a non-empty value', () => {
    const space = {
      id: '',
      name: '',
    };

    expect(validator.validateURLIdentifier(space)).toEqual({
      isInvalid: true,
      error: `URL identifier is required.`,
    });
  });

  test('it requires a valid Space Identifier', () => {
    const space = {
      id: 'invalid identifier',
      name: '',
    };

    expect(validator.validateURLIdentifier(space)).toEqual({
      isInvalid: true,
      error: 'URL identifier can only contain a-z, 0-9, and the characters "_" and "-".',
    });
  });

  test('it allows a valid Space Identifier', () => {
    const space = {
      id: '01-valid-context-01',
      name: '',
    };

    expect(validator.validateURLIdentifier(space)).toEqual({ isInvalid: false });
  });
});

describe('validateSpaceFeatures', () => {
  it('allows features to be disabled', () => {
    const space = {
      id: '',
      name: '',
      disabledFeatures: ['foo'],
    };

    expect(validator.validateEnabledFeatures(space)).toEqual({ isInvalid: false });
  });

  it('allows all features to be disabled', () => {
    const space = {
      id: '',
      name: '',
      disabledFeatures: ['foo', 'bar'],
    };

    expect(validator.validateEnabledFeatures(space)).toEqual({
      isInvalid: false,
    });
  });
});
