/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { FormCreateDrilldown } from '.';
import { render as renderTestingLibrary, fireEvent } from '@testing-library/react';
import { txtNameOfDrilldown } from './i18n';

describe('<FormCreateDrilldown>', () => {
  test('renders without crashing', () => {
    const div = document.createElement('div');
    render(<FormCreateDrilldown name={''} onNameChange={() => {}} />, div);
  });

  describe('[name=]', () => {
    test('if name not provided, uses to empty string', () => {
      const div = document.createElement('div');

      render(<FormCreateDrilldown />, div);

      const input = div.querySelector(
        '[data-test-subj="dynamicActionNameInput"]'
      ) as HTMLInputElement;

      expect(input?.value).toBe('');
    });

    test('can set name input field value', () => {
      const div = document.createElement('div');

      render(<FormCreateDrilldown name={'foo'} />, div);

      const input = div.querySelector(
        '[data-test-subj="dynamicActionNameInput"]'
      ) as HTMLInputElement;

      expect(input?.value).toBe('foo');

      render(<FormCreateDrilldown name={'bar'} />, div);

      expect(input?.value).toBe('bar');
    });

    test('fires onNameChange callback on name change', () => {
      const onNameChange = jest.fn();
      const utils = renderTestingLibrary(
        <FormCreateDrilldown name={''} onNameChange={onNameChange} />
      );
      const input = utils.getByLabelText(txtNameOfDrilldown);

      expect(onNameChange).toHaveBeenCalledTimes(0);

      fireEvent.change(input, { target: { value: 'qux' } });

      expect(onNameChange).toHaveBeenCalledTimes(1);
      expect(onNameChange).toHaveBeenCalledWith('qux');

      fireEvent.change(input, { target: { value: 'quxx' } });

      expect(onNameChange).toHaveBeenCalledTimes(2);
      expect(onNameChange).toHaveBeenCalledWith('quxx');
    });
  });
});
