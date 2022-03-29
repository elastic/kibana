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
import { licenseService } from '../../../../../../common/hooks/use_license';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { EventFiltersListPageState } from '../../../types';
import { sendGetEndpointSpecificPackagePoliciesMock } from '../../../../../services/policies/test_mock_utilts';
import { GetPolicyListResponse } from '../../../../policy/types';
import userEvent from '@testing-library/user-event';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

jest.mock('../../../../../../common/lib/kibana');
jest.mock('../../../../../../common/containers/source');
jest.mock('../../../../../../common/hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

describe('Event filter form', () => {
  let component: RenderResult;
  let mockedContext: AppContextTestRender;
  let render: (
    props?: Partial<React.ComponentProps<typeof EventFiltersForm>>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderWithData: (
    customEventFilterProps?: Partial<ExceptionListItemSchema>
  ) => Promise<ReturnType<AppContextTestRender['render']>>;
  let getState: () => EventFiltersListPageState;
  let policiesRequest: GetPolicyListResponse;

  beforeEach(async () => {
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(true);
    mockedContext = createAppRootMockRenderer();
    policiesRequest = await sendGetEndpointSpecificPackagePoliciesMock();
    getState = () => mockedContext.store.getState().management.eventFilters;
    render = (props) =>
      mockedContext.render(
        <EventFiltersForm policies={policiesRequest.items} arePoliciesLoading={false} {...props} />
      );
    renderWithData = async (customEventFilterProps = {}) => {
      const renderResult = render();
      const entry = getInitialExceptionFromEvent(ecsEventMock());

      act(() => {
        mockedContext.store.dispatch({
          type: 'eventFiltersInitForm',
          payload: { entry: { ...entry, ...customEventFilterProps } },
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

  it('should change description', async () => {
    component = await renderWithData();

    const nameInput = component.getByTestId('eventFilters-form-description-input');

    act(() => {
      fireEvent.change(nameInput, {
        target: {
          value: 'Exception description',
        },
      });
    });

    expect(getState().form.entry?.description).toBe('Exception description');
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
    expect(component.getByTestId(`policy-${policyId}`)).toHaveAttribute(
      'data-test-selected',
      'true'
    );
    // on change called with the previous policy
    expect(getState().form.entry?.tags).toEqual([`policy:${policyId}`]);
  });

  it('should hide assignment section when no license', async () => {
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(false);
    component = await renderWithData();
    expect(component.queryByTestId('perPolicy')).toBeNull();
  });

  it('should hide assignment section when create mode and no license even with by policy', async () => {
    const policyId = policiesRequest.items[0].id;
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(false);
    component = await renderWithData({ tags: [`policy:${policyId}`] });
    expect(component.queryByTestId('perPolicy')).toBeNull();
  });

  it('should show disabled assignment section when edit mode and no license with by policy', async () => {
    const policyId = policiesRequest.items[0].id;
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(false);
    component = await renderWithData({ tags: [`policy:${policyId}`], item_id: '1' });
    expect(component.queryByTestId('perPolicy')).not.toBeNull();
    expect(component.getByTestId(`policy-${policyId}`).getAttribute('aria-disabled')).toBe('true');
  });

  it('should change from by policy to global when edit mode and no license with by policy', async () => {
    const policyId = policiesRequest.items[0].id;
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(false);
    component = await renderWithData({ tags: [`policy:${policyId}`], item_id: '1' });
    userEvent.click(component.getByTestId('globalPolicy'));
    expect(component.queryByTestId('effectedPolicies-select-policiesSelectable')).toBeFalsy();
    expect(getState().form.entry?.tags).toEqual([`policy:all`]);
  });

  it('should not show warning text when unique fields are added', async () => {
    component = await renderWithData({
      entries: [
        {
          field: 'event.category',
          operator: 'included',
          type: 'match',
          value: 'some value',
        },
        {
          field: 'file.name',
          operator: 'excluded',
          type: 'match',
          value: 'some other value',
        },
      ],
    });
    expect(component.queryByTestId('duplicate-fields-warning-message')).toBeNull();
  });

  it('should not show warning text when field values are not added', async () => {
    component = await renderWithData({
      entries: [
        {
          field: 'event.category',
          operator: 'included',
          type: 'match',
          value: '',
        },
        {
          field: 'event.category',
          operator: 'excluded',
          type: 'match',
          value: '',
        },
      ],
    });
    expect(component.queryByTestId('duplicate-fields-warning-message')).toBeNull();
  });

  it('should show warning text when duplicate fields are added with values', async () => {
    component = await renderWithData({
      entries: [
        {
          field: 'event.category',
          operator: 'included',
          type: 'match',
          value: 'some value',
        },
        {
          field: 'event.category',
          operator: 'excluded',
          type: 'match',
          value: 'some other value',
        },
      ],
    });
    expect(component.queryByTestId('duplicate-fields-warning-message')).not.toBeNull();
  });
});
