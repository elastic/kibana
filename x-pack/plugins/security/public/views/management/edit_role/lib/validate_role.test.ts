/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Role } from '../../../../../common/model/role';
import { RoleValidator } from './validate_role';

let validator: RoleValidator;

describe('validateRoleName', () => {
  beforeEach(() => {
    validator = new RoleValidator({ shouldValidate: true });
  });

  test('it allows an alphanumeric role name', () => {
    const role: Role = {
      name: 'This-is-30-character-role-name',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: {
        global: [],
        space: {},
      },
    };

    expect(validator.validateRoleName(role)).toEqual({ isInvalid: false });
  });

  test('it requires a non-empty value', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: {
        global: [],
        space: {},
      },
    };

    expect(validator.validateRoleName(role)).toEqual({
      isInvalid: true,
      error: `Please provide a role name`,
    });
  });

  test('it cannot exceed 1024 characters', () => {
    const role = {
      name: new Array(1026).join('A'),
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: {
        global: [],
        space: {},
      },
    };

    expect(validator.validateRoleName(role)).toEqual({
      isInvalid: true,
      error: `Name must not exceed 1024 characters`,
    });
  });

  const charList = `!#%^&*()+=[]{}\|';:"/,<>?`.split('');
  charList.forEach(element => {
    test(`it cannot support the "${element}" character`, () => {
      const role = {
        name: `role-${element}`,
        elasticsearch: {
          cluster: [],
          indices: [],
          run_as: [],
        },
        kibana: {
          global: [],
          space: {},
        },
      };

      expect(validator.validateRoleName(role)).toEqual({
        isInvalid: true,
        error: `Name must begin with a letter or underscore and contain only letters, underscores, and numbers.`,
      });
    });
  });
});

describe('validateIndexPrivileges', () => {
  beforeEach(() => {
    validator = new RoleValidator({ shouldValidate: true });
  });

  test('it ignores privilegs with no indices defined', () => {
    const role = {
      name: '',
      elasticsearch: {
        indices: [
          {
            names: [],
            privileges: [],
          },
        ],
        cluster: [],
        run_as: [],
      },
      kibana: {
        global: [],
        space: {},
      },
    };

    expect(validator.validateIndexPrivileges(role)).toEqual({
      isInvalid: false,
    });
  });

  test('it requires privilges when an index is defined', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [
          {
            names: ['index-*'],
            privileges: [],
          },
        ],
        run_as: [],
      },
      kibana: {
        global: [],
        space: {},
      },
    };

    expect(validator.validateIndexPrivileges(role)).toEqual({
      isInvalid: true,
    });
  });

  test('it throws when indices is not an array', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: 'asdf',
        run_as: [],
      },
      kibana: {
        global: [],
        space: {},
      },
    };

    // @ts-ignore
    expect(() => validator.validateIndexPrivileges(role)).toThrowErrorMatchingSnapshot();
  });
});

describe('validateInProgressSpacePrivileges', () => {
  beforeEach(() => {
    validator = new RoleValidator({ shouldValidate: true });
  });

  it('should validate when both spaces and privilege is unassigned', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: {
        global: [],
        space: {},
      },
    };

    validator.setInProgressSpacePrivileges([{}, {}]);
    expect(validator.validateInProgressSpacePrivileges(role)).toEqual({ isInvalid: false });
  });

  it('should invalidate when spaces are not assigned to a privilege', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: {
        global: [],
        space: {},
      },
    };

    validator.setInProgressSpacePrivileges([
      {
        privilege: 'all',
      },
    ]);

    expect(validator.validateInProgressSpacePrivileges(role)).toMatchObject({
      isInvalid: true,
    });
  });

  it('should invalidate when a privilege is not assigned to a space', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: {
        global: [],
        space: {},
      },
    };

    validator.setInProgressSpacePrivileges([
      {
        spaces: ['marketing'],
      },
    ]);

    expect(validator.validateInProgressSpacePrivileges(role)).toMatchObject({
      isInvalid: true,
    });
  });

  it('should validate when a privilege is assigned to a space', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: {
        global: [],
        space: {},
      },
    };

    validator.setInProgressSpacePrivileges([
      {
        spaces: ['marketing'],
        privilege: 'all',
      },
    ]);

    expect(validator.validateInProgressSpacePrivileges(role)).toEqual({
      isInvalid: false,
    });
  });

  it('should skip validation if the global privilege is set to "all"', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: {
        global: ['all'],
        space: {},
      },
    };

    validator.setInProgressSpacePrivileges([
      {
        spaces: ['marketing'],
      },
    ]);

    expect(validator.validateInProgressSpacePrivileges(role as Role)).toMatchObject({
      isInvalid: false,
    });
  });
});

describe('validateSpacePrivileges', () => {
  beforeEach(() => {
    validator = new RoleValidator({ shouldValidate: true });
  });

  it('should validate when no privileges are defined', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: {
        global: [],
        space: {},
      },
    };

    expect(validator.validateSpacePrivileges(role)).toEqual({ isInvalid: false });
  });

  it('should validate when a global privilege is defined', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: {
        global: ['all'],
        space: {},
      },
    };

    expect(validator.validateSpacePrivileges(role as Role)).toEqual({ isInvalid: false });
  });

  it('should validate when a space privilege is defined', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: {
        global: [],
        space: {
          marketing: ['read'],
        },
      },
    };

    expect(validator.validateSpacePrivileges(role as Role)).toEqual({ isInvalid: false });
  });

  it('should validate when both global and space privileges are defined', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: {
        global: ['all'],
        space: {
          default: ['foo'],
          marketing: ['read'],
        },
      },
    };

    expect(validator.validateSpacePrivileges(role as Role)).toEqual({ isInvalid: false });
  });

  it('should invalidate when in-progress space privileges are not valid', () => {
    const role = {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: {
        global: ['read'],
        space: {
          default: ['foo'],
          marketing: ['read'],
        },
      },
    };

    validator.setInProgressSpacePrivileges([
      {
        spaces: ['marketing'],
      },
    ]);

    expect(validator.validateSpacePrivileges(role as Role)).toEqual({ isInvalid: true });
  });
});
