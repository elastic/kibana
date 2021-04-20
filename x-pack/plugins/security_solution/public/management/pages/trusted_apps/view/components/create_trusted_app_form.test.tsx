/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import { fireEvent, getByTestId } from '@testing-library/dom';

import {
  ConditionEntryField,
  NewTrustedApp,
  OperatingSystem,
} from '../../../../../../common/endpoint/types';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../common/mock/endpoint';

import { CreateTrustedAppForm, CreateTrustedAppFormProps } from './create_trusted_app_form';
import { defaultNewTrustedApp } from '../../store/builders';
import { forceHTMLElementOffsetWidth } from './effected_policy_select/test_utils';
import { EndpointDocGenerator } from '../../../../../../common/endpoint/generate_data';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';

jest.mock('../../../../../common/hooks/use_experimental_features');
const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;

describe('When using the Trusted App Form', () => {
  const dataTestSubjForForm = 'createForm';
  const generator = new EndpointDocGenerator('effected-policy-select');

  let resetHTMLElementOffsetWidth: ReturnType<typeof forceHTMLElementOffsetWidth>;

  let mockedContext: AppContextTestRender;
  let formProps: jest.Mocked<CreateTrustedAppFormProps>;
  let renderResult: ReturnType<AppContextTestRender['render']>;

  // As the form's `onChange()` callback is executed, this variable will
  // hold the latest updated trusted app. Use it to re-render
  let latestUpdatedTrustedApp: NewTrustedApp;

  const getUI = () => <CreateTrustedAppForm {...formProps} />;
  const render = () => {
    return (renderResult = mockedContext.render(getUI()));
  };
  const rerender = () => renderResult.rerender(getUI());
  const rerenderWithLatestTrustedApp = () => {
    formProps.trustedApp = latestUpdatedTrustedApp;
    rerender();
  };

  // Some helpers
  const setTextFieldValue = (textField: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    reactTestingLibrary.act(() => {
      fireEvent.change(textField, {
        target: { value },
      });
      fireEvent.blur(textField);
    });
  };
  const getNameField = (dataTestSub: string = dataTestSubjForForm): HTMLInputElement => {
    return renderResult.getByTestId(`${dataTestSub}-nameTextField`) as HTMLInputElement;
  };
  const getOsField = (dataTestSub: string = dataTestSubjForForm): HTMLButtonElement => {
    return renderResult.getByTestId(`${dataTestSub}-osSelectField`) as HTMLButtonElement;
  };
  const getGlobalSwitchField = (dataTestSub: string = dataTestSubjForForm): HTMLButtonElement => {
    return renderResult.getByTestId(
      `${dataTestSub}-effectedPolicies-globalSwitch`
    ) as HTMLButtonElement;
  };
  const getDescriptionField = (dataTestSub: string = dataTestSubjForForm): HTMLTextAreaElement => {
    return renderResult.getByTestId(`${dataTestSub}-descriptionField`) as HTMLTextAreaElement;
  };
  const getCondition = (
    index: number = 0,
    dataTestSub: string = dataTestSubjForForm
  ): HTMLElement => {
    return renderResult.getByTestId(`${dataTestSub}-conditionsBuilder-group1-entry${index}`);
  };
  const getAllConditions = (dataTestSub: string = dataTestSubjForForm): HTMLElement[] => {
    return Array.from(
      renderResult.getByTestId(`${dataTestSub}-conditionsBuilder-group1-entries`).children
    ) as HTMLElement[];
  };
  const getConditionRemoveButton = (condition: HTMLElement): HTMLButtonElement => {
    return getByTestId(condition, `${condition.dataset.testSubj}-remove`) as HTMLButtonElement;
  };
  const getConditionFieldSelect = (condition: HTMLElement): HTMLButtonElement => {
    return getByTestId(condition, `${condition.dataset.testSubj}-field`) as HTMLButtonElement;
  };
  const getConditionValue = (condition: HTMLElement): HTMLInputElement => {
    return getByTestId(condition, `${condition.dataset.testSubj}-value`) as HTMLInputElement;
  };
  const getConditionBuilderAndButton = (
    dataTestSub: string = dataTestSubjForForm
  ): HTMLButtonElement => {
    return renderResult.getByTestId(
      `${dataTestSub}-conditionsBuilder-group1-AndButton`
    ) as HTMLButtonElement;
  };
  const getConditionBuilderAndConnectorBadge = (
    dataTestSub: string = dataTestSubjForForm
  ): HTMLElement => {
    return renderResult.getByTestId(`${dataTestSub}-conditionsBuilder-group1-andConnector`);
  };
  const getAllValidationErrors = (): HTMLElement[] => {
    return Array.from(renderResult.container.querySelectorAll('.euiFormErrorText'));
  };

  beforeEach(() => {
    resetHTMLElementOffsetWidth = forceHTMLElementOffsetWidth();
    useIsExperimentalFeatureEnabledMock.mockReturnValue(true);

    mockedContext = createAppRootMockRenderer();

    latestUpdatedTrustedApp = defaultNewTrustedApp();

    formProps = {
      'data-test-subj': dataTestSubjForForm,
      trustedApp: latestUpdatedTrustedApp,
      onChange: jest.fn((updates) => {
        latestUpdatedTrustedApp = updates.item;
      }),
      policies: {
        options: [],
      },
    };
  });

  afterEach(() => {
    resetHTMLElementOffsetWidth();
    reactTestingLibrary.cleanup();
  });

  describe('and the form is rendered', () => {
    beforeEach(() => render());

    it('should show Name as required', () => {
      expect(getNameField().required).toBe(true);
    });

    it('should default OS to Windows', () => {
      expect(getOsField().textContent).toEqual('Windows');
    });

    it('should allow user to select between 3 OSs', () => {
      const osField = getOsField();
      reactTestingLibrary.act(() => {
        fireEvent.click(osField, { button: 1 });
      });
      const options = Array.from(
        renderResult.baseElement.querySelectorAll(
          '.euiSuperSelect__listbox button.euiSuperSelect__item'
        )
      ).map((button) => button.textContent);
      expect(options).toEqual(['Mac', 'Windows', 'Linux']);
    });

    it('should show Description as optional', () => {
      expect(getDescriptionField().required).toBe(false);
    });

    it('should NOT initially show any inline validation errors', () => {
      expect(renderResult.container.querySelectorAll('.euiFormErrorText').length).toBe(0);
    });

    it('should show top-level Errors', () => {
      formProps.isInvalid = true;
      formProps.error = 'a top level error';
      rerender();
      expect(renderResult.queryByText(formProps.error as string)).not.toBeNull();
    });
  });

  describe('the condition builder component', () => {
    beforeEach(() => render());

    it('should show an initial condition entry with labels', () => {
      const defaultCondition = getCondition();
      const labels = Array.from(
        defaultCondition.querySelectorAll('.euiFormRow__labelWrapper')
      ).map((label) => (label.textContent || '').trim());
      expect(labels).toEqual(['Field', 'Operator', 'Value', '']);
    });

    it('should not allow the entry to be removed if its the only one displayed', () => {
      const defaultCondition = getCondition();
      expect(getConditionRemoveButton(defaultCondition).disabled).toBe(true);
    });

    it('should display 2 options for Field', () => {
      const conditionFieldSelect = getConditionFieldSelect(getCondition());
      reactTestingLibrary.act(() => {
        fireEvent.click(conditionFieldSelect, { button: 1 });
      });
      const options = Array.from(
        renderResult.baseElement.querySelectorAll(
          '.euiSuperSelect__listbox button.euiSuperSelect__item'
        )
      ).map((button) => button.textContent);
      expect(options).toEqual([
        'Hashmd5, sha1, or sha256',
        'PathThe full path of the application',
        'SignatureThe signer of the application',
      ]);
    });

    it('should show the value field as required', () => {
      expect(getConditionValue(getCondition()).required).toEqual(true);
    });

    it('should display the `AND` button', () => {
      const andButton = getConditionBuilderAndButton();
      expect(andButton.textContent).toEqual('AND');
      expect(andButton.disabled).toEqual(false);
    });

    describe('and when the AND button is clicked', () => {
      beforeEach(() => {
        const andButton = getConditionBuilderAndButton();
        reactTestingLibrary.act(() => {
          fireEvent.click(andButton, { button: 1 });
        });
        // re-render with updated `newTrustedApp`
        formProps.trustedApp = formProps.onChange.mock.calls[0][0].item;
        rerender();
      });

      it('should add a new condition entry when `AND` is clicked with no column labels', () => {
        const condition2 = getCondition(1);
        expect(condition2.querySelectorAll('.euiFormRow__labelWrapper')).toHaveLength(0);
      });

      it('should have remove buttons enabled when multiple conditions are present', () => {
        getAllConditions().forEach((condition) => {
          expect(getConditionRemoveButton(condition).disabled).toBe(false);
        });
      });

      it('should show the AND visual connector when multiple entries are present', () => {
        expect(getConditionBuilderAndConnectorBadge().textContent).toEqual('AND');
      });
    });
  });

  describe('the Policy Selection area', () => {
    it('should show loader when setting `policies.isLoading` to true', () => {
      formProps.policies.isLoading = true;
      render();
      expect(
        renderResult.getByTestId(`${dataTestSubjForForm}-effectedPolicies-policiesSelectable`)
          .textContent
      ).toEqual('Loading options');
    });

    describe('and policies exist', () => {
      beforeEach(() => {
        const policy = generator.generatePolicyPackagePolicy();
        policy.name = 'test policy A';
        policy.id = '123';

        formProps.policies.options = [policy];
      });

      it('should display the policies available, but disabled if ', () => {
        render();
        expect(renderResult.getByTestId('policy-123'));
      });

      it('should have `global` switch on if effective scope is global and policy options disabled', () => {
        render();
        expect(getGlobalSwitchField().getAttribute('aria-checked')).toEqual('true');
        expect(renderResult.getByTestId('policy-123').getAttribute('aria-disabled')).toEqual(
          'true'
        );
        expect(renderResult.getByTestId('policy-123').getAttribute('aria-selected')).toEqual(
          'false'
        );
      });

      it('should have specific policies checked if scope is per-policy', () => {
        (formProps.trustedApp as NewTrustedApp).effectScope = {
          type: 'policy',
          policies: ['123'],
        };
        render();
        expect(getGlobalSwitchField().getAttribute('aria-checked')).toEqual('false');
        expect(renderResult.getByTestId('policy-123').getAttribute('aria-disabled')).toEqual(
          'false'
        );
        expect(renderResult.getByTestId('policy-123').getAttribute('aria-selected')).toEqual(
          'true'
        );
      });
    });
  });

  describe('the Policy Selection area under feature flag', () => {
    it("shouldn't display the policiy selection area ", () => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(false);
      render();
      expect(
        renderResult.queryByText('Apply trusted application globally')
      ).not.toBeInTheDocument();
    });
  });

  describe('and the user visits required fields but does not fill them out', () => {
    beforeEach(() => {
      render();
      reactTestingLibrary.act(() => {
        fireEvent.blur(getNameField());
      });
      reactTestingLibrary.act(() => {
        fireEvent.blur(getConditionValue(getCondition()));
      });
    });

    it('should show Name validation error', () => {
      expect(renderResult.getByText('Name is required'));
    });

    it('should show Condition validation error', () => {
      expect(renderResult.getByText('[1] Field entry must have a value'));
    });

    it('should NOT display any other errors', () => {
      expect(getAllValidationErrors()).toHaveLength(2);
    });
  });

  describe('and invalid data is entered', () => {
    beforeEach(() => render());

    it('should validate that Name has a non empty space value', () => {
      setTextFieldValue(getNameField(), '  ');
      expect(renderResult.getByText('Name is required'));
    });

    it('should validate invalid Hash value', () => {
      setTextFieldValue(getConditionValue(getCondition()), 'someHASH');
      expect(renderResult.getByText('[1] Invalid hash value'));
    });

    it('should validate that a condition value has a non empty space value', () => {
      setTextFieldValue(getConditionValue(getCondition()), '  ');
      expect(renderResult.getByText('[1] Field entry must have a value'));
    });

    it('should validate all condition values (when multiples exist) have non empty space value', () => {
      const andButton = getConditionBuilderAndButton();
      reactTestingLibrary.act(() => {
        fireEvent.click(andButton, { button: 1 });
      });
      rerenderWithLatestTrustedApp();

      setTextFieldValue(getConditionValue(getCondition()), 'someHASH');
      rerenderWithLatestTrustedApp();

      expect(renderResult.getByText('[2] Field entry must have a value'));
    });

    it('should validate multiple errors in form', () => {
      const andButton = getConditionBuilderAndButton();

      reactTestingLibrary.act(() => {
        fireEvent.click(andButton, { button: 1 });
      });
      rerenderWithLatestTrustedApp();

      setTextFieldValue(getConditionValue(getCondition()), 'someHASH');
      rerenderWithLatestTrustedApp();
      expect(renderResult.getByText('[1] Invalid hash value'));
      expect(renderResult.getByText('[2] Field entry must have a value'));
    });
  });

  describe('and all required data passes validation', () => {
    it('should call change callback with isValid set to true and contain the new item', () => {
      render();

      setTextFieldValue(getNameField(), 'Some Process');
      rerenderWithLatestTrustedApp();

      setTextFieldValue(getConditionValue(getCondition()), 'e50fb1a0e5fff590ece385082edc6c41');
      rerenderWithLatestTrustedApp();

      setTextFieldValue(getDescriptionField(), 'some description');
      rerenderWithLatestTrustedApp();

      expect(getAllValidationErrors()).toHaveLength(0);
      expect(formProps.onChange).toHaveBeenLastCalledWith({
        isValid: true,
        item: {
          name: 'Some Process',
          description: 'some description',
          os: OperatingSystem.WINDOWS,
          effectScope: { type: 'global' },
          entries: [
            {
              field: ConditionEntryField.HASH,
              operator: 'included',
              type: 'match',
              value: 'e50fb1a0e5fff590ece385082edc6c41',
            },
          ],
        },
      });
    });
  });
});
