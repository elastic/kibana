/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import { mount } from 'enzyme';
import { Formik } from 'formik';
import React from 'react';

import { FormRow } from './form_row';

describe('FormRow', () => {
  it('should render form row with correct error state', () => {
    const wrapper = mount(
      <Formik
        onSubmit={jest.fn()}
        initialValues={{ email: '' }}
        initialErrors={{ email: 'Error' }}
        initialTouched={{ email: true }}
      >
        <FormRow>
          <input name="email" />
        </FormRow>
      </Formik>
    );

    expect(wrapper.find(EuiFormRow).props()).toEqual(
      expect.objectContaining({
        error: 'Error',
        isInvalid: true,
      })
    );
  });
});
