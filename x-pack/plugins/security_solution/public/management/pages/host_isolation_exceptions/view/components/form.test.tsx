/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEmptyHostIsolationException } from '../../utils';
import { HostIsolationExceptionsForm } from './form';
import React from 'react';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../common/mock/endpoint';
import { CreateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import userEvent from '@testing-library/user-event';

describe('When on the host isolation exceptions add entry form', () => {
  let render: (
    exception: CreateExceptionListItemSchema
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  const onChange = jest.fn();
  const onError = jest.fn();

  beforeEach(() => {
    onChange.mockReset();
    onError.mockReset();
    const mockedContext = createAppRootMockRenderer();
    render = (exception: CreateExceptionListItemSchema) => {
      return mockedContext.render(
        <HostIsolationExceptionsForm exception={exception} onChange={onChange} onError={onError} />
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
    it('should call onError with true when a wrong ip value is introduced', () => {
      const ipInput = renderResult.getByTestId('hostIsolationExceptions-form-ip-input');
      userEvent.type(ipInput, 'not an ip');
      expect(onError).toHaveBeenCalledWith(true);
    });
    it('should call onError with false when a correct values are introduced', () => {
      const ipInput = renderResult.getByTestId('hostIsolationExceptions-form-ip-input');
      const nameInput = renderResult.getByTestId('hostIsolationExceptions-form-name-input');

      userEvent.type(nameInput, 'test name');
      userEvent.type(ipInput, '10.0.0.1');

      expect(onError).toHaveBeenLastCalledWith(false);
    });
    it('should call onChange when a value is introduced in a field', () => {
      const ipInput = renderResult.getByTestId('hostIsolationExceptions-form-ip-input');
      userEvent.type(ipInput, '10.0.0.1');
      expect(onChange).toHaveBeenLastCalledWith({
        ...newException,
        entries: [
          { field: 'destination.ip', operator: 'included', type: 'match', value: '10.0.0.1' },
        ],
      });
    });
  });
});
