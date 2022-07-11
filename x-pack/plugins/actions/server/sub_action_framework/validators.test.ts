/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsConfigurationUtilities } from '../actions_config';
import { actionsConfigMock } from '../actions_config.mock';
import {
  TestSecretsSchema,
  TestConfigSchema,
  TestConfig,
  TestSecrets,
  TestSubActionConnector,
} from './mocks';
import { IService } from './types';
import { buildValidators } from './validators';

describe('Validators', () => {
  let mockedActionsConfig: jest.Mocked<ActionsConfigurationUtilities>;

  const createValidator = (Service: IService<TestConfig, TestSecrets>) => {
    const connector = {
      id: '.test',
      name: 'Test',
      minimumLicenseRequired: 'basic' as const,
      schema: {
        config: TestConfigSchema,
        secrets: TestSecretsSchema,
      },
      Service,
    };

    return buildValidators({ configurationUtilities: mockedActionsConfig, connector });
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    mockedActionsConfig = actionsConfigMock.create();
  });

  it('should create the config and secrets validators correctly', async () => {
    const validator = createValidator(TestSubActionConnector);
    const { config, secrets } = validator;

    expect(config).toEqual(TestConfigSchema);
    expect(secrets).toEqual(TestSecretsSchema);
  });

  it('should validate the params correctly', async () => {
    const validator = createValidator(TestSubActionConnector);
    const { params } = validator;
    expect(params.validate({ subAction: 'test', subActionParams: {} }));
  });

  it('should allow any field in subActionParams', async () => {
    const validator = createValidator(TestSubActionConnector);
    const { params } = validator;
    expect(
      params.validate({
        subAction: 'test',
        subActionParams: {
          foo: 'foo',
          bar: 1,
          baz: [{ test: 'hello' }, 1, 'test', false],
          isValid: false,
          val: null,
        },
      })
    ).toEqual({
      subAction: 'test',
      subActionParams: {
        foo: 'foo',
        bar: 1,
        baz: [{ test: 'hello' }, 1, 'test', false],
        isValid: false,
        val: null,
      },
    });
  });

  it.each([
    [undefined],
    [null],
    [1],
    [false],
    [{ test: 'hello' }],
    [['test']],
    [{ test: 'hello' }],
  ])('should throw if the subAction is %p', async (subAction) => {
    const validator = createValidator(TestSubActionConnector);
    const { params } = validator;
    expect(() => params.validate({ subAction, subActionParams: {} })).toThrow();
  });
});
