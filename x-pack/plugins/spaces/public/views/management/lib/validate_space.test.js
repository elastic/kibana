/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpaceValidator } from './validate_space';

let validator;

describe('validateSpaceName', () => {
  beforeEach(() => {
    validator = new SpaceValidator({ shouldValidate: true });
  });

  test('it allows a name with special characters', () => {
    const space = {
      name: 'This is the name of my Space! @#$%^&*()_+-='
    };

    expect(validator.validateSpaceName(space)).toEqual({ isInvalid: false });
  });

  test('it requires a non-empty value', () => {
    const space = {
      name: ''
    };

    expect(validator.validateSpaceName(space)).toEqual({ isInvalid: true, error: `Name is required` });
  });

  test('it cannot exceed 1024 characters', () => {
    const space = {
      name: new Array(1026).join('A')
    };

    expect(validator.validateSpaceName(space)).toEqual({ isInvalid: true, error: `Name must not exceed 1024 characters` });
  });
});

describe('validateSpaceDescription', () => {
  test('is optional', () => {
    const space = {
    };

    expect(validator.validateSpaceDescription(space)).toEqual({ isInvalid: false });
  });

  test('it cannot exceed 2000 characters', () => {
    const space = {
      description: new Array(2002).join('A')
    };

    expect(validator.validateSpaceDescription(space)).toEqual({ isInvalid: true, error: `Description must not exceed 2000 characters` });
  });
});

describe('validateURLIdentifier', () => {
  test('it does not validate reserved spaces', () => {
    const space = {
      _reserved: true
    };

    expect(validator.validateURLIdentifier(space)).toEqual({ isInvalid: false });
  });

  test('it requires a non-empty value', () => {
    const space = {
      id: ''
    };

    expect(validator.validateURLIdentifier(space)).toEqual({ isInvalid: true, error: `URL Identifier is required` });
  });

  test('it requires a valid Space Identifier', () => {
    const space = {
      id: 'invalid identifier'
    };

    expect(validator.validateURLIdentifier(space))
      .toEqual({ isInvalid: true, error: 'URL Identifier only allows a-z, 0-9, "_", and the "-" character' });
  });

  test('it allows a valid Space Identifier', () => {
    const space = {
      id: '01-valid-context-01'
    };

    expect(validator.validateURLIdentifier(space)).toEqual({ isInvalid: false });
  });
});
