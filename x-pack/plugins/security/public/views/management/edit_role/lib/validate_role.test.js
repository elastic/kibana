/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RoleValidator } from "./validate_role";

let validator;

describe('validateRoleName', () => {
  beforeEach(() => {
    validator = new RoleValidator({ shouldValidate: true });
  });

  test('it allows an alphanumeric role name', () => {
    const role = {
      name: 'This-is-30-character-role-name'
    };

    expect(validator.validateRoleName(role)).toEqual({ isInvalid: false });
  });

  test('it requires a non-empty value', () => {
    const role = {
      name: ''
    };

    expect(validator.validateRoleName(role)).toEqual({ isInvalid: true, error: `Please provide a role name` });
  });

  test('it cannot exceed 1024 characters', () => {
    const role = {
      name: new Array(1026).join('A')
    };

    expect(validator.validateRoleName(role)).toEqual({ isInvalid: true, error: `Name must not exceed 1024 characters` });
  });

  const charList = `!#%^&*()+=[]{}\|';:"/,<>?`.split('');
  charList.forEach(element => {
    test(`it cannot support the "${element}" character`, () => {
      const role = {
        name: `role-${element}`
      };

      expect(validator.validateRoleName(role)).toEqual(
        {
          isInvalid: true,
          error: `Name must begin with a letter or underscore and contain only letters, underscores, and numbers.`
        }
      );
    });
  });
});

describe('validateIndexPrivileges', () => {
  beforeEach(() => {
    validator = new RoleValidator({ shouldValidate: true });
  });

  test('it ignores privilegs with no indices defined', () => {
    const role = {
      indices: [{
        names: [],
        privileges: []
      }]
    };

    expect(validator.validateIndexPrivileges(role)).toEqual({
      isInvalid: false
    });
  });

  test('it requires privilges when an index is defined', () => {
    const role = {
      indices: [{
        names: ['index-*'],
        privileges: []
      }]
    };

    expect(validator.validateIndexPrivileges(role)).toEqual({
      isInvalid: true
    });
  });

  test('it throws when indices is not an array', () => {
    const role = {
      indices: null
    };

    expect(() => validator.validateIndexPrivileges(role)).toThrowErrorMatchingSnapshot();
  });
});
