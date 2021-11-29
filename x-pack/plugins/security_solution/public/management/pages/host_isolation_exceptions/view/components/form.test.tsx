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
import {
  CreateExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import userEvent from '@testing-library/user-event';
import uuid from 'uuid';
import { sendGetEndpointSpecificPackagePoliciesMock } from '../../../../services/test_mock_utilts';

describe('When on the host isolation exceptions entry form', () => {
  let render: (
    exception: CreateExceptionListItemSchema | UpdateExceptionListItemSchema
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  const onChange = jest.fn();
  const onError = jest.fn();

  beforeEach(() => {
    onChange.mockReset();
    onError.mockReset();
    const mockedContext = createAppRootMockRenderer();
    const policiesRequest = sendGetEndpointSpecificPackagePoliciesMock();
    render = (exception) => {
      return mockedContext.render(
        <HostIsolationExceptionsForm
          exception={exception}
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
  });

  describe('When editing an existing exception', () => {
    let existingException: UpdateExceptionListItemSchema;
    beforeEach(() => {
      existingException = {
        ...createEmptyHostIsolationException(),
        name: 'name edit me',
        description: 'initial description',
        id: uuid.v4(),
        item_id: uuid.v4(),
        entries: [
          {
            field: 'destination.ip',
            operator: 'included',
            type: 'match',
            value: '10.0.0.1',
          },
        ],
      };
      renderResult = render(existingException);
    });

    it('should render the form with pre-filled inputs', () => {
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
      const ipInput = renderResult.getByTestId('hostIsolationExceptions-form-ip-input');
      userEvent.clear(ipInput);
      userEvent.type(ipInput, '10.0.100.1');
      expect(onChange).toHaveBeenCalledWith({
        entries: [
          { field: 'destination.ip', operator: 'included', type: 'match', value: '10.0.100.1' },
        ],
      });
    });
  });
});
