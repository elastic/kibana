/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { actionTypeRegistryMock } from '../../../../../../triggers_actions_ui/public/application/action_type_registry.mock';
import { isUuidv4, getActionTypeName, validateMustache, validateActionParams } from './utils';

describe('stepRuleActions utils', () => {
  describe('isUuidv4', () => {
    it('should validate proper uuid v4 value', () => {
      expect(isUuidv4('817b8bca-91d1-4729-8ee1-3a83aaafd9d4')).toEqual(true);
    });

    it('should validate incorrect uuid v4 value', () => {
      expect(isUuidv4('ad9d4')).toEqual(false);
    });
  });

  describe('getActionTypeName', () => {
    it('should return capitalized action type name', () => {
      expect(getActionTypeName('.slack')).toEqual('Slack');
    });

    it('should return empty string actionTypeId had improper format', () => {
      expect(getActionTypeName('slack')).toEqual('');
    });
  });

  describe('validateMustache', () => {
    it('should validate mustache template', () => {
      expect(
        validateMustache({
          message: 'Mustache Template {{variable}}',
        })
      ).toHaveLength(0);
    });

    it('should validate incorrect mustache template', () => {
      expect(
        validateMustache({
          message: 'Mustache Template {{{variable}}',
        })
      ).toHaveLength(1);
    });
  });

  describe('validateActionParams', () => {
    const validateParamsMock = jest.fn();
    const actionTypeRegistry = actionTypeRegistryMock.create();

    beforeAll(() => {
      const actionMock = {
        id: 'id',
        iconClass: 'iconClass',
        validateParams: validateParamsMock,
        selectMessage: 'message',
        validateConnector: jest.fn(),
        actionConnectorFields: null,
        actionParamsFields: null,
      };
      actionTypeRegistry.get.mockReturnValue(actionMock);
    });

    it('should validate action params', () => {
      validateParamsMock.mockReturnValue({ errors: [] });

      expect(
        validateActionParams(
          {
            id: '817b8bca-91d1-4729-8ee1-3a83aaafd9d4',
            group: 'default',
            actionTypeId: '.slack',
            params: {
              message: 'Message',
            },
          },
          actionTypeRegistry
        )
      ).toHaveLength(0);
    });

    it('should validate incorrect action params', () => {
      validateParamsMock.mockReturnValue({
        errors: ['Message is required'],
      });

      expect(
        validateActionParams(
          {
            id: '817b8bca-91d1-4729-8ee1-3a83aaafd9d4',
            group: 'default',
            actionTypeId: '.slack',
            params: {},
          },
          actionTypeRegistry
        )
      ).toHaveLength(1);
    });

    it('should validate incorrect action params and filter error objects', () => {
      validateParamsMock.mockReturnValue({
        errors: [
          {
            message: 'Message is required',
          },
        ],
      });

      expect(
        validateActionParams(
          {
            id: '817b8bca-91d1-4729-8ee1-3a83aaafd9d4',
            group: 'default',
            actionTypeId: '.slack',
            params: {},
          },
          actionTypeRegistry
        )
      ).toHaveLength(0);
    });

    it('should validate incorrect action params and filter duplicated errors', () => {
      validateParamsMock.mockReturnValue({
        errors: ['Message is required', 'Message is required', 'Message is required'],
      });

      expect(
        validateActionParams(
          {
            id: '817b8bca-91d1-4729-8ee1-3a83aaafd9d4',
            group: 'default',
            actionTypeId: '.slack',
            params: {},
          },
          actionTypeRegistry
        )
      ).toHaveLength(1);
    });
  });
});
