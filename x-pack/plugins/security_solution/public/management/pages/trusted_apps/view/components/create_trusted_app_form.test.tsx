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
import { fireEvent } from '@testing-library/dom';

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
    expect(queryByText(formProps.error)).not.toBeNull();
  });

  describe('the condition builder component', () => {
    it.todo('should show an initial condition entry');

    it.todo('should not allow the entry to be removed if its the only one displayed');

    it.todo('should display 2 options for Field');

    it.todo('should show the value field as required');

    it.todo('should display the `AND` button');

    it.todo('should add a new condition entry when `AND` is clicked');

    it.todo('should have remove icons enabled when multiple conditions are present');
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
