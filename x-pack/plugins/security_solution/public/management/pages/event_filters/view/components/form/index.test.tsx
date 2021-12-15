/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EventFiltersForm } from '.';
import { RenderResult, act } from '@testing-library/react';
import { fireEvent, waitFor } from '@testing-library/dom';
import { stubIndexPattern } from 'src/plugins/data/common/stubs';
import { getInitialExceptionFromEvent } from '../../../store/utils';
import { useFetchIndex } from '../../../../../../common/containers/source';
import { ecsEventMock } from '../../../test_utils';
import { NAME_ERROR, NAME_PLACEHOLDER } from './translations';
import { useCurrentUser, useKibana } from '../../../../../../common/lib/kibana';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { EventFiltersListPageState } from '../../../types';
import { sendGetEndpointSpecificPackagePoliciesMock } from '../../../../../services/policies/test_mock_utilts';
import { GetPolicyListResponse } from '../../../../policy/types';
import userEvent from '@testing-library/user-event';

jest.mock('../../../../../../common/lib/kibana');
jest.mock('../../../../../../common/containers/source');

describe('Event filter form', () => {
  let component: RenderResult;
  let mockedContext: AppContextTestRender;
  let render: (
    props?: Partial<React.ComponentProps<typeof EventFiltersForm>>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderWithData: () => Promise<ReturnType<AppContextTestRender['render']>>;
  let getState: () => EventFiltersListPageState;
  let policiesRequest: GetPolicyListResponse;

  beforeEach(async () => {
    mockedContext = createAppRootMockRenderer();
    policiesRequest = await sendGetEndpointSpecificPackagePoliciesMock();
    getState = () => mockedContext.store.getState().management.eventFilters;
    render = (props) =>
      mockedContext.render(
        <EventFiltersForm policies={policiesRequest.items} arePoliciesLoading={false} {...props} />
      );
    renderWithData = async () => {
      const renderResult = render();
      const entry = getInitialExceptionFromEvent(ecsEventMock());
      act(() => {
        mockedContext.store.dispatch({
          type: 'eventFiltersInitForm',
          payload: { entry },
        });
      });
      await waitFor(() => {
        expect(renderResult.getByTestId('exceptionsBuilderWrapper')).toBeInTheDocument();
      });
      return renderResult;
    };

    (useFetchIndex as jest.Mock).mockImplementation(() => [
      false,
      {
        indexPatterns: stubIndexPattern,
      },
    ]);
    (useCurrentUser as jest.Mock).mockReturnValue({ username: 'test-username' });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: {},
        data: {},
        notifications: {},
      },
    });
  });

  it('should renders correctly without data', () => {
    component = render();
    expect(component.getByTestId('loading-spinner')).not.toBeNull();
  });

  it('should renders correctly with data', async () => {
    component = await renderWithData();

    expect(component.getByTestId('exceptionsBuilderWrapper')).not.toBeNull();
  });

  it('should displays loader when policies are still loading', () => {
    component = render({ arePoliciesLoading: true });

    expect(component.queryByTestId('exceptionsBuilderWrapper')).toBeNull();
    expect(component.getByTestId('loading-spinner')).not.toBeNull();
  });

  it('should display sections', async () => {
    component = await renderWithData();

    expect(component.queryByText('Details')).not.toBeNull();
    expect(component.queryByText('Conditions')).not.toBeNull();
    expect(component.queryByText('Comments')).not.toBeNull();
  });

  it('should display name error only when on blur and empty name', async () => {
    component = await renderWithData();
    expect(component.queryByText(NAME_ERROR)).toBeNull();
    const nameInput = component.getByPlaceholderText(NAME_PLACEHOLDER);
    act(() => {
      fireEvent.blur(nameInput);
    });
    expect(component.queryByText(NAME_ERROR)).not.toBeNull();
  });

  it('should change name', async () => {
    component = await renderWithData();

    const nameInput = component.getByPlaceholderText(NAME_PLACEHOLDER);

    act(() => {
      fireEvent.change(nameInput, {
        target: {
          value: 'Exception name',
        },
      });
    });

    expect(getState().form.entry?.name).toBe('Exception name');
    expect(getState().form.hasNameError).toBeFalsy();
  });

  it('should change name with a white space still shows an error', async () => {
    component = await renderWithData();

    const nameInput = component.getByPlaceholderText(NAME_PLACEHOLDER);

    act(() => {
      fireEvent.change(nameInput, {
        target: {
          value: ' ',
        },
      });
    });

    expect(getState().form.entry?.name).toBe('');
    expect(getState().form.hasNameError).toBeTruthy();
  });

  it('should change comments', async () => {
    component = await renderWithData();

    const commentInput = component.getByPlaceholderText('Add a new comment...');

    act(() => {
      fireEvent.change(commentInput, {
        target: {
          value: 'Exception comment',
        },
      });
    });

    expect(getState().form.newComment).toBe('Exception comment');
  });

  it('should display the policy list when "per policy" is selected', async () => {
    component = await renderWithData();
    userEvent.click(component.getByTestId('perPolicy'));

    // policy selector should show up
    expect(component.getByTestId('effectedPolicies-select-policiesSelectable')).toBeTruthy();
  });

  it('should call onChange when a policy is selected from the policy selectiion', async () => {
    component = await renderWithData();

    const policyId = policiesRequest.items[0].id;
    userEvent.click(component.getByTestId('perPolicy'));
    userEvent.click(component.getByTestId(`policy-${policyId}`));
    expect(getState().form.entry?.tags).toEqual([`policy:${policyId}`]);
  });

  it('should have global policy by default', async () => {
    component = await renderWithData();

    expect(component.getByTestId('globalPolicy')).toBeChecked();
    expect(component.getByTestId('perPolicy')).not.toBeChecked();
  });

  it('should retain the previous policy selection when switching from per-policy to global', async () => {
    const policyId = policiesRequest.items[0].id;

    component = await renderWithData();

    // move to per-policy and select the first
    userEvent.click(component.getByTestId('perPolicy'));
    userEvent.click(component.getByTestId(`policy-${policyId}`));
    expect(component.queryByTestId('effectedPolicies-select-policiesSelectable')).toBeTruthy();
    expect(getState().form.entry?.tags).toEqual([`policy:${policyId}`]);

    // move back to global
    userEvent.click(component.getByTestId('globalPolicy'));
    expect(component.queryByTestId('effectedPolicies-select-policiesSelectable')).toBeFalsy();
    expect(getState().form.entry?.tags).toEqual([`policy:all`]);

    // move back to per-policy
    userEvent.click(component.getByTestId('perPolicy'));
    // the previous selected policy should be selected
    expect(component.getByTestId(`policy-${policyId}`)).toHaveAttribute('aria-selected', 'true');
    // on change called with the previous policy
    expect(getState().form.entry?.tags).toEqual([`policy:${policyId}`]);
  });
});
