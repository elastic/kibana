/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import userEvent from '@testing-library/user-event';
import React from 'react';
import uuid from 'uuid';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../common/mock/endpoint';
import { sendGetEndpointSpecificPackagePoliciesMock } from '../../../../services/policies/test_mock_utilts';
import { GetPolicyListResponse } from '../../../policy/types';
import { createEmptyHostIsolationException } from '../../utils';
import { HostIsolationExceptionsForm } from './form';

describe('When on the host isolation exceptions entry form', () => {
  let render: (
    exception: CreateExceptionListItemSchema | UpdateExceptionListItemSchema
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  const onChange = jest.fn();
  const onError = jest.fn();
  let policiesRequest: GetPolicyListResponse;

  beforeEach(async () => {
    onChange.mockReset();
    onError.mockReset();
    const mockedContext = createAppRootMockRenderer();
    policiesRequest = await sendGetEndpointSpecificPackagePoliciesMock();
    render = (exception) => {
      return mockedContext.render(
        <HostIsolationExceptionsForm
          item={exception}
          policies={policiesRequest.items}
          onChange={onChange}
          onError={onError}
        />
      );
    };
  });

  describe('When creating a new exception', () => {
    let newException: CreateExceptionListItemSchema;
    beforeEach(() => {
      newException = createEmptyHostIsolationException();
      renderResult = render(newException);
    });

    it('should render the form with empty inputs', () => {
      expect(renderResult.getByTestId('hostIsolationExceptions-form-name-input')).toHaveValue('');
      expect(renderResult.getByTestId('hostIsolationExceptions-form-ip-input')).toHaveValue('');
      expect(
        renderResult.getByTestId('hostIsolationExceptions-form-description-input')
      ).toHaveValue('');
    });

    it.each(['not an ip', '100', '900.0.0.1', 'x.x.x.x', '10.0.0'])(
      'should call onError with true when a wrong ip value is introduced. Case: "%s"',
      (value: string) => {
        const nameInput = renderResult.getByTestId('hostIsolationExceptions-form-name-input');
        const ipInput = renderResult.getByTestId('hostIsolationExceptions-form-ip-input');
        userEvent.type(nameInput, 'test name');
        userEvent.type(ipInput, value);
        expect(onError).toHaveBeenCalledWith(true);
      }
    );

    it.each(['192.168.0.1', '10.0.0.1', '100.90.1.1/24', '192.168.200.6/30'])(
      'should call onError with false when a correct ip value is introduced. Case: "%s"',
      (value: string) => {
        const ipInput = renderResult.getByTestId('hostIsolationExceptions-form-ip-input');
        const nameInput = renderResult.getByTestId('hostIsolationExceptions-form-name-input');

        userEvent.type(nameInput, 'test name');
        userEvent.type(ipInput, value);

        expect(onError).toHaveBeenLastCalledWith(false);
      }
    );

    it('should call onChange with the partial change when a value is introduced in a field', () => {
      const ipInput = renderResult.getByTestId('hostIsolationExceptions-form-ip-input');
      userEvent.type(ipInput, '10.0.0.1');
      expect(onChange).toHaveBeenLastCalledWith({
        entries: [
          { field: 'destination.ip', operator: 'included', type: 'match', value: '10.0.0.1' },
        ],
      });
    });

    it('should select the "global" policy by default', () => {
      expect(
        renderResult
          .getByTestId('effectedPolicies-select-global')
          .classList.contains('euiButtonGroupButton-isSelected')
      ).toBe(true);
      // policy selector should be hidden
      expect(renderResult.queryByTestId('effectedPolicies-select-policiesSelectable')).toBeFalsy();
    });

    it('should display the policy list when "per policy" is selected', () => {
      userEvent.click(renderResult.getByTestId('perPolicy'));

      // policy selector should show up
      expect(renderResult.getByTestId('effectedPolicies-select-policiesSelectable')).toBeTruthy();
    });

    it('should call onChange when a policy is selected from the policy selectiion', () => {
      const policyId = policiesRequest.items[0].id;
      userEvent.click(renderResult.getByTestId('perPolicy'));
      userEvent.click(renderResult.getByTestId(`policy-${policyId}`));
      expect(onChange).toHaveBeenLastCalledWith({
        tags: [`policy:${policyId}`],
      });
    });

    it('should retain the previous policy selection when switching from per-policy to global', () => {
      const policyId = policiesRequest.items[0].id;

      // move to per-policy and select the first
      userEvent.click(renderResult.getByTestId('perPolicy'));
      userEvent.click(renderResult.getByTestId(`policy-${policyId}`));
      expect(renderResult.queryByTestId('effectedPolicies-select-policiesSelectable')).toBeTruthy();
      expect(onChange).toHaveBeenLastCalledWith({
        tags: [`policy:${policyId}`],
      });

      // move back to global
      userEvent.click(renderResult.getByTestId('globalPolicy'));
      expect(renderResult.queryByTestId('effectedPolicies-select-policiesSelectable')).toBeFalsy();
      expect(onChange).toHaveBeenLastCalledWith({
        tags: [`policy:all`],
      });

      // move back to per-policy
      userEvent.click(renderResult.getByTestId('perPolicy'));
      // the previous selected policy should be selected
      expect(renderResult.getByTestId(`policy-${policyId}`)).toHaveAttribute(
        'data-test-selected',
        'true'
      );
      // on change called with the previous policy
      expect(onChange).toHaveBeenLastCalledWith({
        tags: [`policy:${policyId}`],
      });
    });
  });

  /**
   * NOTE: fewer tests exists for update as the form component
   * behaves the same for edit and add with the only
   * difference of having pre-filled fields
   */
  describe('When editing an existing exception with global policy', () => {
    let existingException: UpdateExceptionListItemSchema;
    beforeEach(() => {
      existingException = {
        ...createEmptyHostIsolationException(),
        name: 'name edit me',
        description: 'initial description',
        id: uuid.v4(),
        item_id: uuid.v4(),
        tags: ['policy:all'],
        entries: [
          {
            field: 'destination.ip',
            operator: 'included',
            type: 'match',
            value: '10.0.0.1',
          },
        ],
      };
    });

    it('should render the form with pre-filled inputs', () => {
      renderResult = render(existingException);
      expect(renderResult.getByTestId('hostIsolationExceptions-form-name-input')).toHaveValue(
        'name edit me'
      );
      expect(renderResult.getByTestId('hostIsolationExceptions-form-ip-input')).toHaveValue(
        '10.0.0.1'
      );
      expect(
        renderResult.getByTestId('hostIsolationExceptions-form-description-input')
      ).toHaveValue('initial description');
    });

    it('should call onChange with the partial change when a value is introduced in a field', () => {
      renderResult = render(existingException);
      const ipInput = renderResult.getByTestId('hostIsolationExceptions-form-ip-input');
      userEvent.clear(ipInput);
      userEvent.type(ipInput, '10.0.100.1');
      expect(onChange).toHaveBeenCalledWith({
        entries: [
          { field: 'destination.ip', operator: 'included', type: 'match', value: '10.0.100.1' },
        ],
      });
    });

    it('should show global pre-selected', () => {
      renderResult = render(existingException);
      expect(
        renderResult
          .getByTestId('effectedPolicies-select-global')
          .classList.contains('euiButtonGroupButton-isSelected')
      ).toBe(true);
      // policy selector should be hidden
      expect(renderResult.queryByTestId('effectedPolicies-select-policiesSelectable')).toBeFalsy();
    });

    it('should show pre-selected policies', () => {
      const policyId1 = policiesRequest.items[0].id;
      const policyId2 = policiesRequest.items[3].id;
      existingException.tags = [`policy:${policyId1}`, `policy:${policyId2}`];

      renderResult = render(existingException);

      expect(renderResult.queryByTestId('effectedPolicies-select-policiesSelectable')).toBeTruthy();
      expect(renderResult.getByTestId(`policy-${policyId1}`)).toHaveAttribute(
        'data-test-selected',
        'true'
      );
      expect(renderResult.getByTestId(`policy-${policyId2}`)).toHaveAttribute(
        'data-test-selected',
        'true'
      );
    });

    it('should show the policies selector when no policy is selected', () => {
      existingException.tags = [];

      renderResult = render(existingException);

      expect(renderResult.queryByTestId('effectedPolicies-select-policiesSelectable')).toBeTruthy();
    });

    it('should show the policies selector when no policy is selected and there are previous tags', () => {
      existingException.tags = ['non-a-policy-tag'];

      renderResult = render(existingException);

      expect(renderResult.queryByTestId('effectedPolicies-select-policiesSelectable')).toBeTruthy();
    });
  });
});
