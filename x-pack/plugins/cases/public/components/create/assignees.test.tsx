/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';

import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { userProfiles } from '../../containers/user_profiles/api.mock';
import { Assignees } from './assignees';
import type { FormProps } from './schema';
import { act, waitFor, screen } from '@testing-library/react';
import * as api from '../../containers/user_profiles/api';
import type { UserProfile } from '@kbn/user-profile-components';

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

  it('allows selection of similarly named users', async () => {
    const similarProfiles: UserProfile[] = [
      {
        uid: '123',
        enabled: true,
        data: {},
        user: {
          username: '123',
          full_name: 'Turtle',
        },
      },
      {
        uid: '456',
        enabled: true,
        data: {},
        user: {
          username: '456',
          full_name: 'turtle',
        },
      },
    ];

    const spyOnSuggestUserProfiles = jest.spyOn(api, 'suggestUserProfiles');
    spyOnSuggestUserProfiles.mockResolvedValue(similarProfiles);

    appMockRender.render(
      <MockHookWrapperComponent>
        <Assignees isLoading={false} />
      </MockHookWrapperComponent>
    );

    await waitFor(() => {
      expect(screen.getByTestId('comboBoxSearchInput')).not.toBeDisabled();
    });

    act(() => {
      userEvent.click(screen.getByTestId('comboBoxSearchInput'));
    });

    await waitFor(() => {
      expect(screen.getByText('Turtle')).toBeInTheDocument();
      expect(screen.getByText('turtle')).toBeInTheDocument();
    });

    act(() => {
      userEvent.click(screen.getByText('Turtle'));
    });

    // ensure that the similar user is still available for selection
    await waitFor(() => {
      expect(screen.getByText('turtle')).toBeInTheDocument();
    });
  });
});
