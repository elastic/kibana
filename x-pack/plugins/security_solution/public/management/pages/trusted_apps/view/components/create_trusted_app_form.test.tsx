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

describe('When showing the Trusted App Create Form', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let onChangeCallback: jest.MockedFunction<CreateTrustedAppFormProps['onChange']>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    onChangeCallback = jest.fn();
    render = () => mockedContext.render(<CreateTrustedAppForm onChange={onChangeCallback} />);
  });

  it.todo('should show Name as required');

  it.todo('should default OS to Windows');

  it.todo('should allow user to select between 3 OSs');

  it.todo('should show Description as optional');

  it.todo('should NOT initially show any inline validation errors');

  it.todo('should show top-level Errors');

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
