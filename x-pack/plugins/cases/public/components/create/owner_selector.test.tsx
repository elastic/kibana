/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act, waitFor } from '@testing-library/react';

import { SECURITY_SOLUTION_OWNER } from '../../../common';
import { OBSERVABILITY_OWNER } from '../../../common/constants';
import { useForm, Form, FormHook } from '../../common/shared_imports';
import { CreateCaseOwnerSelector } from './owner_selector';
import { schema, FormProps } from './schema';
import { waitForComponentToPaint } from '../../common/test_utils';

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
    jest.clearAllMocks();
  });

  it('renders', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <CreateCaseOwnerSelector availableOwners={[SECURITY_SOLUTION_OWNER]} isLoading={false} />
      </MockHookWrapperComponent>
    );

    await waitForComponentToPaint(wrapper);
    expect(wrapper.find(`[data-test-subj="caseOwnerSelector"]`).exists()).toBeTruthy();
  });

  it.each([
    [OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER],
    [SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER],
  ])('disables %s button if user only has %j', async (disabledButton, permission) => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <CreateCaseOwnerSelector availableOwners={[permission]} isLoading={false} />
      </MockHookWrapperComponent>
    );

    await waitForComponentToPaint(wrapper);

    expect(
      wrapper.find(`[data-test-subj="${disabledButton}RadioButton"] input`).first().props().disabled
    ).toBeTruthy();
    expect(
      wrapper.find(`[data-test-subj="${permission}RadioButton"] input`).first().props().disabled
    ).toBeFalsy();
    expect(
      wrapper.find(`[data-test-subj="${permission}RadioButton"] input`).first().props().checked
    ).toBeTruthy();
  });

  it('defaults to security Solution', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <CreateCaseOwnerSelector
          availableOwners={[OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER]}
          isLoading={false}
        />
      </MockHookWrapperComponent>
    );

    await waitForComponentToPaint(wrapper);

    expect(
      wrapper.find(`[data-test-subj="observabilityRadioButton"] input`).first().props().checked
    ).toBeFalsy();
    expect(
      wrapper.find(`[data-test-subj="securitySolutionRadioButton"] input`).first().props().checked
    ).toBeTruthy();
  });

  it('it changes the selection', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <CreateCaseOwnerSelector
          availableOwners={[OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER]}
          isLoading={false}
        />
      </MockHookWrapperComponent>
    );

    await act(async () => {
      wrapper
        .find(`[data-test-subj="observabilityRadioButton"] input`)
        .first()
        .simulate('change', OBSERVABILITY_OWNER);
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

    expect(globalForm.getFormData()).toEqual({ selectedOwner: OBSERVABILITY_OWNER });

    await act(async () => {
      wrapper
        .find(`[data-test-subj="securitySolutionRadioButton"] input`)
        .first()
        .simulate('change', SECURITY_SOLUTION_OWNER);
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

    expect(globalForm.getFormData()).toEqual({ selectedOwner: SECURITY_SOLUTION_OWNER });
  });
});
