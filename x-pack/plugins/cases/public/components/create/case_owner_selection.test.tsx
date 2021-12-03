/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act, waitFor } from '@testing-library/react';

import { useForm, Form, FormHook } from '../../common/shared_imports';
import { CaseOwnerSelection } from './case_owner_selection';
import { schema, FormProps } from './schema';

const OBSERVABILITY = 'observability';
const SECURITY_SOLUTION = 'securitySolution';

describe('Case Owner Selection', () => {
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

  it('renders', () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <CaseOwnerSelection availableOwners={[SECURITY_SOLUTION]} isLoading={false} />
      </MockHookWrapperComponent>
    );

    expect(wrapper.find(`[data-test-subj="caseOwnerSelection"]`).exists()).toBeTruthy();
  });

  it.each([
    [OBSERVABILITY, SECURITY_SOLUTION],
    [SECURITY_SOLUTION, OBSERVABILITY],
  ])('disables %s button if user only has %j', (disabledButton, permission) => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <CaseOwnerSelection availableOwners={[permission]} isLoading={false} />
      </MockHookWrapperComponent>
    );

    expect(
      wrapper.find(`[data-test-subj="${disabledButton}RadioButton"] input`).first().props().disabled
    ).toBeTruthy();
    expect(
      wrapper.find(`[data-test-subj="${permission}RadioButton"] input`).first().props().disabled
    ).toBeFalsy();
  });

  it('it changes the selection', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <CaseOwnerSelection
          availableOwners={[OBSERVABILITY, SECURITY_SOLUTION]}
          isLoading={false}
        />
      </MockHookWrapperComponent>
    );

    await act(async () => {
      wrapper
        .find(`[data-test-subj="observabilityRadioButton"] input`)
        .first()
        .simulate('change', 'observability');
    });

    await waitFor(() => {
      wrapper.update();
      expect(
        wrapper.find(`[data-test-subj="observabilityRadioButton"] input`).first().props().checked
      ).toBeTruthy();
      expect(
        wrapper.find(`[data-test-subj="securitySolutionRadioButton"] input`).first().props().checked
      ).toBeFalsy();
    });

    expect(globalForm.getFormData()).toEqual({ selectedOwner: 'observability' });

    await act(async () => {
      wrapper
        .find(`[data-test-subj="securitySolutionRadioButton"] input`)
        .first()
        .simulate('change', 'securitySolution');
    });

    await waitFor(() => {
      wrapper.update();
      expect(
        wrapper.find(`[data-test-subj="securitySolutionRadioButton"] input`).first().props().checked
      ).toBeTruthy();
      expect(
        wrapper.find(`[data-test-subj="observabilityRadioButton"] input`).first().props().checked
      ).toBeFalsy();
    });

    expect(globalForm.getFormData()).toEqual({ selectedOwner: 'securitySolution' });
  });
});
