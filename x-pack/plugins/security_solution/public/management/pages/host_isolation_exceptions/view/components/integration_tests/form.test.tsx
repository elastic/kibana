/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListItemSchema,
  FoundExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { HostIsolationExceptionsList } from '../../host_isolation_exceptions_list';
import { act, waitFor } from '@testing-library/react';
import { HOST_ISOLATION_EXCEPTIONS_PATH } from '../../../../../../../common/constants';
import {
  exceptionsListAllHttpMocks,
  fleetGetEndpointPackagePolicyListHttpMock,
} from '../../../../../mocks';
import {
  clickOnEffectedPolicy,
  isEffectedPolicySelected,
} from '../../../../../components/effected_policy_select/test_utils';
import { BY_POLICY_ARTIFACT_TAG_PREFIX } from '../../../../../../../common/endpoint/service/artifacts';
import type { HttpFetchOptionsWithPath } from '@kbn/core/public';
import { testIdPrefix } from '../form';

jest.mock('../../../../../../common/components/user_privileges');

describe('When on the host isolation exceptions entry form', () => {
  let render: () => Promise<ReturnType<AppContextTestRender['render']>>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;
  let exceptionsApiMock: ReturnType<typeof exceptionsListAllHttpMocks>;
  let fleetApiMock: ReturnType<typeof fleetGetEndpointPackagePolicyListHttpMock>;

  const formRowHasError = (testId: string): boolean => {
    const formRow = renderResult.getByTestId(testId);

    return formRow.querySelector('.euiFormErrorText') !== null;
  };

  const submitButtonDisabledState = (): boolean => {
    return (
      renderResult.getByTestId(
        'hostIsolationExceptionsListPage-flyout-submitButton'
      ) as HTMLButtonElement
    ).disabled;
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = async () => {
      renderResult = mockedContext.render(<HostIsolationExceptionsList />);

      await waitFor(async () => {
        await expect(
          renderResult.findAllByTestId('hostIsolationExceptionsListPage-card')
        ).resolves.toHaveLength(10);
      });

      userEvent.click(renderResult.getByTestId('hostIsolationExceptionsListPage-pageAddButton'));

      await waitFor(() => {
        expect(renderResult.getByTestId('hostIsolationExceptions-form')).toBeTruthy();
        expect(fleetApiMock.responseProvider.endpointPackagePolicyList).toHaveBeenCalled();
      });
      return renderResult;
    };

    exceptionsApiMock = exceptionsListAllHttpMocks(mockedContext.coreStart.http);
    fleetApiMock = fleetGetEndpointPackagePolicyListHttpMock(mockedContext.coreStart.http);

    act(() => {
      history.push(HOST_ISOLATION_EXCEPTIONS_PATH);
    });
  });

  describe('and creating a new exception', () => {
    beforeEach(async () => {
      await render();
    });

    it('should render the form with empty inputs', () => {
      expect(renderResult.getByTestId('hostIsolationExceptions-form-name-input')).toHaveValue('');
      expect(renderResult.getByTestId('hostIsolationExceptions-form-ip-input')).toHaveValue('');
      expect(
        renderResult.getByTestId('hostIsolationExceptions-form-description-input')
      ).toHaveValue('');
    });

    it('should keep submit button disabled if only the name is entered', async () => {
      const nameInput = renderResult.getByTestId('hostIsolationExceptions-form-name-input');

      userEvent.type(nameInput, 'test name');
      userEvent.click(renderResult.getByTestId('hostIsolationExceptions-form-description-input'));

      await waitFor(() => {
        expect(submitButtonDisabledState()).toBe(true);
      });
    });

    it.each([['not an ip'], ['100'], ['900.0.0.1'], ['x.x.x.x'], ['10.0.0']])(
      'should show validation error when a wrong ip value is entered. Case: "%s"',
      async (value: string) => {
        const ipInput = renderResult.getByTestId('hostIsolationExceptions-form-ip-input');

        userEvent.type(ipInput, value);
        userEvent.click(renderResult.getByTestId('hostIsolationExceptions-form-description-input'));

        await waitFor(() => {
          expect(formRowHasError('hostIsolationExceptions-form-ip-input-formRow')).toBe(true);
          expect(submitButtonDisabledState()).toBe(true);
        });
      }
    );

    it.each([['192.168.0.1'], ['10.0.0.1'], ['100.90.1.1/24'], ['192.168.200.6/30']])(
      'should NOT show validation error when a correct ip value is entered. Case: "%s"',
      async (value: string) => {
        const ipInput = renderResult.getByTestId('hostIsolationExceptions-form-ip-input');
        const nameInput = renderResult.getByTestId('hostIsolationExceptions-form-name-input');

        userEvent.type(nameInput, 'test name');
        userEvent.type(ipInput, value);

        expect(formRowHasError('hostIsolationExceptions-form-ip-input-formRow')).toBe(false);

        await waitFor(() => {
          expect(submitButtonDisabledState()).toBe(false);
        });
      }
    );

    it('should select the "global" policy by default', () => {
      expect(
        renderResult
          .getByTestId(`${testIdPrefix}-effectedPolicies-global`)
          .classList.contains('euiButtonGroupButton-isSelected')
      ).toBe(true);
    });

    it('should show policy as selected when user clicks on it', async () => {
      userEvent.click(
        renderResult.getByTestId('hostIsolationExceptions-form-effectedPolicies-perPolicy')
      );
      await clickOnEffectedPolicy(renderResult, testIdPrefix);

      await expect(isEffectedPolicySelected(renderResult, testIdPrefix)).resolves.toBe(true);
    });

    it('should retain the previous policy selection when switching from per-policy to global', async () => {
      // move to per-policy and select the first
      userEvent.click(
        renderResult.getByTestId('hostIsolationExceptions-form-effectedPolicies-perPolicy')
      );
      await clickOnEffectedPolicy(renderResult, testIdPrefix);

      await expect(isEffectedPolicySelected(renderResult, testIdPrefix)).resolves.toBe(true);

      // move back to global
      userEvent.click(
        renderResult.getByTestId('hostIsolationExceptions-form-effectedPolicies-global')
      );

      expect(
        renderResult.queryByTestId(`${testIdPrefix}-effectedPolicies-policiesSelectable`)
      ).toBeFalsy();

      // move back to per-policy
      userEvent.click(
        renderResult.getByTestId('hostIsolationExceptions-form-effectedPolicies-perPolicy')
      );
      await expect(isEffectedPolicySelected(renderResult, testIdPrefix)).resolves.toBe(true);
    });
  });

  describe('and editing an existing exception with global policy', () => {
    let existingException: ExceptionListItemSchema;

    beforeEach(() => {
      const generateExceptionsFindResponse =
        exceptionsApiMock.responseProvider.exceptionsFind.getMockImplementation()!;

      exceptionsApiMock.responseProvider.exceptionsFind.mockImplementation((options) => {
        const response: FoundExceptionListItemSchema = generateExceptionsFindResponse(options);

        Object.assign(response.data[0], {
          name: 'name edit me',
          description: 'initial description',
          item_id: '123-321',
          tags: ['policy:all'],
          entries: [
            {
              field: 'destination.ip',
              operator: 'included',
              type: 'match',
              value: '10.0.0.1',
            },
          ],
        });

        return response;
      });

      existingException = exceptionsApiMock.responseProvider.exceptionsFind({
        query: {},
      } as HttpFetchOptionsWithPath).data[0];

      exceptionsApiMock.responseProvider.exceptionGetOne.mockImplementation(() => {
        return existingException;
      });

      act(() => {
        history.push(`${HOST_ISOLATION_EXCEPTIONS_PATH}?itemId=123-321&show=edit`);
      });
    });

    it('should render the form with pre-filled inputs', async () => {
      await render();
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

    it('should update field with new value', async () => {
      await render();
      const ipInput = renderResult.getByTestId('hostIsolationExceptions-form-ip-input');
      userEvent.clear(ipInput);
      userEvent.type(ipInput, '10.0.100.1');

      expect(
        (renderResult.getByTestId('hostIsolationExceptions-form-ip-input') as HTMLInputElement)
          .value
      ).toBe('10.0.100.1');
    });

    it('should show global pre-selected', async () => {
      await render();

      expect(
        renderResult
          .getByTestId(`${testIdPrefix}-effectedPolicies-global`)
          .classList.contains('euiButtonGroupButton-isSelected')
      ).toBe(true);
    });

    it('should show pre-selected policies', async () => {
      const policyApiResponse = fleetApiMock.responseProvider.endpointPackagePolicyList();
      const policyId1 = policyApiResponse.items[0].id;
      const policyId2 = policyApiResponse.items[3].id;

      existingException.tags = [
        `${BY_POLICY_ARTIFACT_TAG_PREFIX}${policyId1}`,
        `${BY_POLICY_ARTIFACT_TAG_PREFIX}${policyId2}`,
      ];

      await render();

      await expect(isEffectedPolicySelected(renderResult, testIdPrefix, 0)).resolves.toBe(true);
      await expect(isEffectedPolicySelected(renderResult, testIdPrefix, 3)).resolves.toBe(true);
    });

    it('should show the policies selector when no policy is selected', async () => {
      existingException.tags = [];
      await render();

      expect(
        renderResult.queryByTestId(`${testIdPrefix}-effectedPolicies-policiesSelectable`)
      ).toBeTruthy();
    });

    it('should show the policies selector when no policy is selected and there are previous tags', async () => {
      existingException.tags = ['non-a-policy-tag'];
      await render();

      expect(
        renderResult.queryByTestId(`${testIdPrefix}-effectedPolicies-policiesSelectable`)
      ).toBeTruthy();
    });
  });
});
