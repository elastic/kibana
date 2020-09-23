/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../common/mock/endpoint';
import * as reactTestingLibrary from '@testing-library/react';
import React from 'react';
import { CreateTrustedAppForm, CreateTrustedAppFormProps } from './create_trusted_app_form';
import { fireEvent, getByTestId } from '@testing-library/dom';

describe('When showing the Trusted App Create Form', () => {
  const dataTestSubjForForm = 'createForm';
  type RenderResultType = ReturnType<AppContextTestRender['render']>;

  let render: () => RenderResultType;
  let formProps: jest.Mocked<CreateTrustedAppFormProps>;

  // Some helpers
  const getNameField = (
    renderResult: RenderResultType,
    dataTestSub: string = dataTestSubjForForm
  ): HTMLInputElement => {
    return renderResult.getByTestId(`${dataTestSub}-nameTextField`) as HTMLInputElement;
  };
  const getOsField = (
    renderResult: RenderResultType,
    dataTestSub: string = dataTestSubjForForm
  ): HTMLButtonElement => {
    return renderResult.getByTestId(`${dataTestSub}-osSelectField`) as HTMLButtonElement;
  };
  const getDescriptionField = (
    renderResult: RenderResultType,
    dataTestSub: string = dataTestSubjForForm
  ): HTMLTextAreaElement => {
    return renderResult.getByTestId(`${dataTestSub}-descriptionField`) as HTMLTextAreaElement;
  };
  const getCondition = (
    renderResult: RenderResultType,
    index: number = 0,
    dataTestSub: string = dataTestSubjForForm
  ): HTMLElement => {
    return renderResult.getByTestId(`${dataTestSub}-conditionsBuilder-group1-entry${index}`);
  };
  const getAllConditions = (
    renderResult: RenderResultType,
    dataTestSub: string = dataTestSubjForForm
  ): HTMLElement[] => {
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
    renderResult: RenderResultType,
    dataTestSub: string = dataTestSubjForForm
  ): HTMLButtonElement => {
    return renderResult.getByTestId(
      `${dataTestSub}-conditionsBuilder-AndButton`
    ) as HTMLButtonElement;
  };
  const getConditionBuilderAndConnectorBadge = (
    renderResult: RenderResultType,
    dataTestSub: string = dataTestSubjForForm
  ): HTMLElement => {
    return renderResult.getByTestId(`${dataTestSub}-conditionsBuilder-group1-andConnector`);
  };

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    formProps = {
      'data-test-subj': dataTestSubjForForm,
      onChange: jest.fn(),
    };
    render = () => mockedContext.render(<CreateTrustedAppForm {...formProps} />);
  });

  it('should show Name as required', () => {
    expect(getNameField(render()).required).toBe(true);
  });

  it('should default OS to Windows', () => {
    expect(getOsField(render()).textContent).toEqual('Windows');
  });

  it('should allow user to select between 3 OSs', () => {
    const renderResult = render();
    const osField = getOsField(renderResult);
    reactTestingLibrary.act(() => {
      fireEvent.click(osField, { button: 1 });
    });
    const options = Array.from(
      renderResult.baseElement.querySelectorAll(
        '.euiSuperSelect__listbox button.euiSuperSelect__item'
      )
    ).map((button) => button.textContent);
    expect(options).toEqual(['Mac OS', 'Windows', 'Linux']);
  });

  it('should show Description as optional', () => {
    expect(getDescriptionField(render()).required).toBe(false);
  });

  it('should NOT initially show any inline validation errors', () => {
    expect(render().container.querySelectorAll('.euiFormErrorText').length).toBe(0);
  });

  it('should show top-level Errors', () => {
    formProps.isInvalid = true;
    formProps.error = 'a top level error';
    const { queryByText } = render();
    expect(queryByText(formProps.error as string)).not.toBeNull();
  });

  describe('the condition builder component', () => {
    it('should show an initial condition entry with labels', () => {
      const defaultCondition = getCondition(render());
      const labels = Array.from(
        defaultCondition.querySelectorAll('.euiFormRow__labelWrapper')
      ).map((label) => (label.textContent || '').trim());
      expect(labels).toEqual(['Field', 'Operator', 'Value', '']);
    });

    it('should not allow the entry to be removed if its the only one displayed', () => {
      const defaultCondition = getCondition(render());
      expect(getConditionRemoveButton(defaultCondition).disabled).toBe(true);
    });

    it('should display 2 options for Field', () => {
      const renderResult = render();
      const conditionFieldSelect = getConditionFieldSelect(getCondition(renderResult));
      reactTestingLibrary.act(() => {
        fireEvent.click(conditionFieldSelect, { button: 1 });
      });
      const options = Array.from(
        renderResult.baseElement.querySelectorAll(
          '.euiSuperSelect__listbox button.euiSuperSelect__item'
        )
      ).map((button) => button.textContent);
      expect(options).toEqual(['Hash', 'Path']);
    });

    it('should show the value field as required', () => {
      expect(getConditionValue(getCondition(render())).required).toEqual(true);
    });

    it('should display the `AND` button', () => {
      const andButton = getConditionBuilderAndButton(render());
      expect(andButton.textContent).toEqual('AND');
      expect(andButton.disabled).toEqual(false);
    });

    describe('and when the AND button is clicked', () => {
      let renderResult: RenderResultType;

      beforeEach(() => {
        renderResult = render();
        const andButton = getConditionBuilderAndButton(renderResult);
        reactTestingLibrary.act(() => {
          fireEvent.click(andButton, { button: 1 });
        });
      });

      it('should add a new condition entry when `AND` is clicked with no labels', () => {
        const condition2 = getCondition(renderResult, 1);
        expect(condition2.querySelectorAll('.euiFormRow__labelWrapper')).toHaveLength(0);
      });

      it('should have remove buttons enabled when multiple conditions are present', () => {
        getAllConditions(renderResult).forEach((condition) => {
          expect(getConditionRemoveButton(condition).disabled).toBe(false);
        });
      });

      it('should show the AND visual connector when multiple entries are present', () => {
        expect(getConditionBuilderAndConnectorBadge(renderResult).textContent).toEqual('AND');
      });
    });
  });

  describe('and the user visits required fields but does not fill them out', () => {
    it.todo('should show Name validation error');

    it.todo('should show Condition validation error');

    it.todo('should NOT display any other errors');

    it.todo('should call change callback with isValid set to false and contain the new item');
  });

  describe('and invalid data is entered', () => {
    it.todo('should validate that Name has a non empty space value');

    it.todo('should validate that a condition value has a non empty space value');

    it.todo(
      'should validate all condition values (when multiples exist) have non empty space value'
    );
  });

  describe('and all required data passes validation', () => {
    it.todo('should call change callback with isValid set to true and contain the new item');
  });
});
