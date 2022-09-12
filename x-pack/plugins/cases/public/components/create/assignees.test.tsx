/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { AppMockRenderer, createAppMockRenderer } from '../../common/mock';

import { useForm, Form, FormHook } from '../../common/shared_imports';
import { userProfiles } from '../../containers/user_profiles/api.mock';
import { Assignees } from './assignees';
import { FormProps } from './schema';
import { act, waitFor } from '@testing-library/react';
import * as api from '../../containers/user_profiles/api';
import { UserProfile } from '@kbn/user-profile-components';

jest.mock('../../containers/user_profiles/api');

const currentUserProfile = userProfiles[0];

describe('Assignees', () => {
  let globalForm: FormHook;
  let appMockRender: AppMockRenderer;

  const MockHookWrapperComponent: React.FC = ({ children }) => {
    const { form } = useForm<FormProps>();
    globalForm = form;

    return <Form form={form}>{children}</Form>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders', async () => {
    const result = appMockRender.render(
      <MockHookWrapperComponent>
        <Assignees isLoading={false} />
      </MockHookWrapperComponent>
    );

    await waitFor(() => {
      expect(result.getByTestId('comboBoxSearchInput')).not.toBeDisabled();
    });

    expect(result.getByTestId('createCaseAssigneesComboBox')).toBeInTheDocument();
  });

  it('does not render the assign yourself link when the current user profile is undefined', async () => {
    const spyOnGetCurrentUserProfile = jest.spyOn(api, 'getCurrentUserProfile');
    spyOnGetCurrentUserProfile.mockResolvedValue(undefined as unknown as UserProfile);

    const result = appMockRender.render(
      <MockHookWrapperComponent>
        <Assignees isLoading={false} />
      </MockHookWrapperComponent>
    );

    await waitFor(() => {
      expect(result.getByTestId('comboBoxSearchInput')).not.toBeDisabled();
    });

    expect(result.queryByTestId('create-case-assign-yourself-link')).not.toBeInTheDocument();
    expect(result.getByTestId('createCaseAssigneesComboBox')).toBeInTheDocument();
  });

  it('selects the current user correctly', async () => {
    const spyOnGetCurrentUserProfile = jest.spyOn(api, 'getCurrentUserProfile');
    spyOnGetCurrentUserProfile.mockResolvedValue(currentUserProfile);

    const result = appMockRender.render(
      <MockHookWrapperComponent>
        <Assignees isLoading={false} />
      </MockHookWrapperComponent>
    );

    await waitFor(() => {
      expect(result.getByTestId('comboBoxSearchInput')).not.toBeDisabled();
    });

    act(() => {
      userEvent.click(result.getByTestId('create-case-assign-yourself-link'));
    });

    await waitFor(() => {
      expect(globalForm.getFormData()).toEqual({ assignees: [{ uid: currentUserProfile.uid }] });
    });
  });

  it('disables the assign yourself button if the current user is already selected', async () => {
    const spyOnGetCurrentUserProfile = jest.spyOn(api, 'getCurrentUserProfile');
    spyOnGetCurrentUserProfile.mockResolvedValue(currentUserProfile);

    const result = appMockRender.render(
      <MockHookWrapperComponent>
        <Assignees isLoading={false} />
      </MockHookWrapperComponent>
    );

    await waitFor(() => {
      expect(result.getByTestId('comboBoxSearchInput')).not.toBeDisabled();
    });

    act(() => {
      userEvent.click(result.getByTestId('create-case-assign-yourself-link'));
    });

    await waitFor(() => {
      expect(globalForm.getFormData()).toEqual({ assignees: [{ uid: currentUserProfile.uid }] });
    });

    expect(result.getByTestId('create-case-assign-yourself-link')).toBeDisabled();
  });

  it('assignees users correctly', async () => {
    const result = appMockRender.render(
      <MockHookWrapperComponent>
        <Assignees isLoading={false} />
      </MockHookWrapperComponent>
    );

    await waitFor(() => {
      expect(result.getByTestId('comboBoxSearchInput')).not.toBeDisabled();
    });

    await act(async () => {
      await userEvent.type(result.getByTestId('comboBoxSearchInput'), 'dr', { delay: 1 });
    });

    await waitFor(() => {
      expect(
        result.getByTestId('comboBoxOptionsList createCaseAssigneesComboBox-optionsList')
      ).toBeInTheDocument();
    });

    await waitFor(async () => {
      expect(result.getByText(`${currentUserProfile.user.full_name}`)).toBeInTheDocument();
    });

    act(() => {
      userEvent.click(result.getByText(`${currentUserProfile.user.full_name}`));
    });

    await waitFor(() => {
      expect(globalForm.getFormData()).toEqual({ assignees: [{ uid: currentUserProfile.uid }] });
    });
  });
});
