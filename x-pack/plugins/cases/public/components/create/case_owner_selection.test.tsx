/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act } from '@testing-library/react';

import { useForm, Form, FormHook } from '../../common/shared_imports';
import { CaseOwnerSelection } from './case_owner_selection';
import { schema, FormProps } from './schema';

// const useAvailableCasesOwners = jest.fn(() => ['securitySolution']);

jest.mock('../app/use_available_owners', () => ({
  useAvailableCasesOwners: () => ['securitySolution', 'observability'],
}));

describe('Description', () => {
  let globalForm: FormHook;

  const MockHookWrapperComponent: React.FC = ({ children }) => {
    const { form } = useForm<FormProps>({
      defaultValue: { selectedOwner: '' },
      schema: {
        selectedOwner: schema.selectedOwner,
      },
    });

    globalForm = form;

    return <Form form={form}>{children}</Form>;
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <CaseOwnerSelection isLoading={false} />
      </MockHookWrapperComponent>
    );

    expect(wrapper.find(`[data-test-subj="caseOwnerSelection"]`).exists()).toBeTruthy();
  });

  it.skip('it changes the selection', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <CaseOwnerSelection isLoading={false} />
      </MockHookWrapperComponent>
    );

    await act(async () => {
      wrapper.find(`[data-test-subj="observabilityRadioButton"] input`).simulate('click');
    });

    expect(globalForm.getFormData()).toEqual({ selectedOwner: 'observability' });
  });
});
