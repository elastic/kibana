/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSingleAction, validateRuleActionsField } from './schema';
import { isUuid, getActionTypeName, validateMustache, validateActionParams } from './utils';
import { actionTypeRegistryMock } from '../../../../../../triggers_actions_ui/public/application/action_type_registry.mock';
import { FormHook } from '../../../../shared_imports';
jest.mock('./utils');

describe('stepRuleActions schema', () => {
  const actionTypeRegistry = actionTypeRegistryMock.create();

  describe('validateSingleAction', () => {
    it('should validate single action', async () => {
      (isUuid as jest.Mock).mockReturnValue(true);
      (validateActionParams as jest.Mock).mockReturnValue([]);
      (validateMustache as jest.Mock).mockReturnValue([]);

      expect(
        await validateSingleAction(
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

    it('should validate single action with invalid mustache template', async () => {
      (isUuid as jest.Mock).mockReturnValue(true);
      (validateActionParams as jest.Mock).mockReturnValue([]);
      (validateMustache as jest.Mock).mockReturnValue(['Message is not valid mustache template']);

      const errors = await validateSingleAction(
        {
          id: '817b8bca-91d1-4729-8ee1-3a83aaafd9d4',
          group: 'default',
          actionTypeId: '.slack',
          params: {
            message: '{{{mustache}}',
          },
        },
        actionTypeRegistry
      );

      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual('Message is not valid mustache template');
    });

    it('should validate single action with incorrect id', async () => {
      (isUuid as jest.Mock).mockReturnValue(false);
      (validateMustache as jest.Mock).mockReturnValue([]);
      (validateActionParams as jest.Mock).mockReturnValue([]);

      const errors = await validateSingleAction(
        {
          id: '823d4',
          group: 'default',
          actionTypeId: '.slack',
          params: {},
        },
        actionTypeRegistry
      );
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual('No connector selected');
    });
  });

  describe('validateRuleActionsField', () => {
    it('should validate rule actions field', async () => {
      const validator = validateRuleActionsField(actionTypeRegistry);

      const result = await validator({
        path: '',
        value: [],
        form: {} as FormHook,
        formData: jest.fn(),
        errors: [],
        customData: { value: null, provider: () => Promise.resolve(null) },
      });

      expect(result).toEqual(undefined);
    });

    it('should validate incorrect rule actions field', async () => {
      (getActionTypeName as jest.Mock).mockReturnValue('Slack');
      const validator = validateRuleActionsField(actionTypeRegistry);

      const result = await validator({
        path: '',
        value: [
          {
            id: '3',
            group: 'default',
            actionTypeId: '.slack',
            params: {},
          },
        ],
        form: {} as FormHook,
        formData: jest.fn(),
        errors: [],
        customData: { value: null, provider: () => Promise.resolve(null) },
      });

      expect(result).toEqual({
        code: 'ERR_FIELD_FORMAT',
        message: `
**Slack:**
*   No connector selected
`,
        path: '',
      });
    });

    it('should validate multiple incorrect rule actions field', async () => {
      (isUuid as jest.Mock).mockReturnValueOnce(false);
      (getActionTypeName as jest.Mock).mockReturnValueOnce('Slack');
      (isUuid as jest.Mock).mockReturnValueOnce(true);
      (getActionTypeName as jest.Mock).mockReturnValueOnce('Pagerduty');
      (validateActionParams as jest.Mock).mockReturnValue(['Summary is required']);
      (validateMustache as jest.Mock).mockReturnValue(['Component is not valid mustache template']);
      const validator = validateRuleActionsField(actionTypeRegistry);

      const result = await validator({
        path: '',
        value: [
          {
            id: '817b8bca-91d1-4729-8ee1-3a83aaafd9d4',
            group: 'default',
            actionTypeId: '.slack',
            params: {},
          },
          {
            id: 'a8d1ef21-dcb9-4ac6-9e52-961f938a4c17',
            group: 'default',
            actionTypeId: '.pagerduty',
            params: {
              component: '{{{',
            },
          },
        ],
        form: {} as FormHook,
        formData: jest.fn(),
        errors: [],
        customData: { value: null, provider: () => Promise.resolve(null) },
      });

      expect(result).toEqual({
        code: 'ERR_FIELD_FORMAT',
        message: `
**Slack:**
*   No connector selected


**Pagerduty:**
*   Summary is required
*   Component is not valid mustache template
`,
        path: '',
      });
    });
  });
});
