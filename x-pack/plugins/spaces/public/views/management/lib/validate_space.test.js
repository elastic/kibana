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

    expect(validator.validateSpaceName(space)).toEqual({ isInvalid: true, error: `Please provide a space name` });
  });

  test('it cannot exceed 1024 characters', () => {
    const space = {
      name: new Array(1026).join('A')
    };

    expect(validator.validateSpaceName(space)).toEqual({ isInvalid: true, error: `Name must not exceed 1024 characters` });
  });
});

describe('validateSpaceDescription', () => {
  test('it requires a non-empty value', () => {
    const space = {
      description: ''
    };

    expect(validator.validateSpaceDescription(space)).toEqual({ isInvalid: true, error: `Please provide a space description` });
  });
});

describe('validateUrlContext', () => {
  test('it does not validate reserved spaces', () => {
    const space = {
      _reserved: true
    };

    expect(validator.validateUrlContext(space)).toEqual({ isInvalid: false });
  });

  test('it requires a non-empty value', () => {
    const space = {
      urlContext: ''
    };

    expect(validator.validateUrlContext(space)).toEqual({ isInvalid: true, error: `URL Context is required` });
  });

  test('it requires a valid URL Context', () => {
    const space = {
      urlContext: 'invalid context'
    };

    expect(validator.validateUrlContext(space))
      .toEqual({ isInvalid: true, error: 'URL Context only allows a-z, 0-9, and the "-" character' });
  });

  test('it allows a valid URL Context', () => {
    const space = {
      urlContext: '01-valid-context-01'
    };

    expect(validator.validateUrlContext(space)).toEqual({ isInvalid: false });
  });
});