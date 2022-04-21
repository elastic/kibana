/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EventFiltersFlyout, EventFiltersFlyoutProps } from '.';
import * as reactTestingLibrary from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { MiddlewareActionSpyHelper } from '../../../../../../common/store/test_utils';
import { sendGetEndpointSpecificPackagePolicies } from '../../../../../services/policies/policies';
import { sendGetEndpointSpecificPackagePoliciesMock } from '../../../../../services/policies/test_mock_utils';
import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ecsEventMock, esResponseData, eventFiltersListQueryHttpMock } from '../../../test_utils';
import { getFormEntryState, isUninitialisedForm } from '../../../store/selector';
import { EventFiltersListPageState } from '../../../types';
import { useKibana } from '../../../../../../common/lib/kibana';
import { licenseService } from '../../../../../../common/hooks/use_license';
import { getExceptionListItemSchemaMock } from '../../../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { of } from 'rxjs';

jest.mock('../../../../../../common/lib/kibana');
jest.mock('../form');
jest.mock('../../../../../services/policies/policies');

jest.mock('../../hooks', () => {
  const originalModule = jest.requireActual('../../hooks');
  const useEventFiltersNotification = jest.fn().mockImplementation(() => {});

  return {
    ...originalModule,
    useEventFiltersNotification,
  };
});

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

(sendGetEndpointSpecificPackagePolicies as jest.Mock).mockImplementation(
  sendGetEndpointSpecificPackagePoliciesMock
);

let component: reactTestingLibrary.RenderResult;
let mockedContext: AppContextTestRender;
let waitForAction: MiddlewareActionSpyHelper['waitForAction'];
let render: (
  props?: Partial<EventFiltersFlyoutProps>
) => ReturnType<AppContextTestRender['render']>;
const act = reactTestingLibrary.act;
let onCancelMock: jest.Mock;
let getState: () => EventFiltersListPageState;
let mockedApi: ReturnType<typeof eventFiltersListQueryHttpMock>;

describe('Event filter flyout', () => {
  beforeEach(() => {
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(true);
    mockedContext = createAppRootMockRenderer();
    waitForAction = mockedContext.middlewareSpy.waitForAction;
    onCancelMock = jest.fn();
    getState = () => mockedContext.store.getState().management.eventFilters;
    mockedApi = eventFiltersListQueryHttpMock(mockedContext.coreStart.http);

    render = (props) => {
      return mockedContext.render(<EventFiltersFlyout {...props} onCancel={onCancelMock} />);
    };

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        docLinks: {
          links: {
            securitySolution: {
              eventFilters: '',
            },
          },
        },
        http: {},
        data: {
          search: {
            search: jest.fn().mockImplementation(() => of(esResponseData())),
          },
        },
        notifications: {},
      },
    });
  });

  afterEach(() => reactTestingLibrary.cleanup());

  it('should renders correctly', () => {
    component = render();
    expect(component.getAllByText('Add event filter')).not.toBeNull();
    expect(component.getByText('Cancel')).not.toBeNull();
  });

  it('should renders correctly with data ', async () => {
    await act(async () => {
      component = render({ data: ecsEventMock() });
      await waitForAction('eventFiltersInitForm');
    });
    expect(component.getAllByText('Add endpoint event filter')).not.toBeNull();
    expect(component.getByText('Cancel')).not.toBeNull();
  });

  it('should dispatch action to init form store on mount', async () => {
    await act(async () => {
      render();
      await waitForAction('eventFiltersInitForm');
    });

    expect(getFormEntryState(getState())).not.toBeUndefined();
    expect(getFormEntryState(getState())?.entries[0].field).toBe('');
  });

  it('should confirm form when button is disabled', () => {
    component = render();
    const confirmButton = component.getByTestId('add-exception-confirm-button');
    act(() => {
      fireEvent.click(confirmButton);
    });
    expect(isUninitialisedForm(getState())).toBeTruthy();
  });

  it('should confirm form when button is enabled', async () => {
    component = render();

    mockedContext.store.dispatch({
      type: 'eventFiltersChangeForm',
      payload: {
        entry: {
          ...(getState().form?.entry as CreateExceptionListItemSchema),
          name: 'test',
          os_types: ['windows'],
        },
        hasNameError: false,
        hasOSError: false,
      },
    });
    await reactTestingLibrary.waitFor(() => {
      expect(sendGetEndpointSpecificPackagePolicies).toHaveBeenCalled();
    });
    const confirmButton = component.getByTestId('add-exception-confirm-button');

    await act(async () => {
      fireEvent.click(confirmButton);
      await waitForAction('eventFiltersCreateSuccess');
    });
    expect(isUninitialisedForm(getState())).toBeTruthy();
    expect(confirmButton.hasAttribute('disabled')).toBeFalsy();
  });

  it('should close when exception has been submitted correctly', () => {
    render();
    expect(onCancelMock).toHaveBeenCalledTimes(0);

    act(() => {
      mockedContext.store.dispatch({
        type: 'eventFiltersFormStateChanged',
        payload: {
          type: 'LoadedResourceState',
          data: getState().form?.entry as ExceptionListItemSchema,
        },
      });
    });

    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it('should close when click on cancel button', () => {
    component = render();
    const cancelButton = component.getByText('Cancel');
    expect(onCancelMock).toHaveBeenCalledTimes(0);

    act(() => {
      fireEvent.click(cancelButton);
    });

    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it('should close when close flyout', () => {
    component = render();
    const flyoutCloseButton = component.getByTestId('euiFlyoutCloseButton');
    expect(onCancelMock).toHaveBeenCalledTimes(0);

    act(() => {
      fireEvent.click(flyoutCloseButton);
    });

    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it('should prevent close when is loading action', () => {
    component = render();
    act(() => {
      mockedContext.store.dispatch({
        type: 'eventFiltersFormStateChanged',
        payload: {
          type: 'LoadingResourceState',
          previousState: { type: 'UninitialisedResourceState' },
        },
      });
    });

    const cancelButton = component.getByText('Cancel');
    expect(onCancelMock).toHaveBeenCalledTimes(0);

    act(() => {
      fireEvent.click(cancelButton);
    });

    expect(onCancelMock).toHaveBeenCalledTimes(0);
  });

  it('should renders correctly when id and edit type', () => {
    component = render({ id: 'fakeId', type: 'edit' });

    expect(component.getAllByText('Update event filter')).not.toBeNull();
    expect(component.getByText('Cancel')).not.toBeNull();
  });

  it('should dispatch action to init form store on mount with id', async () => {
    await act(async () => {
      render({ id: 'fakeId', type: 'edit' });
      await waitForAction('eventFiltersInitFromId');
    });

    expect(getFormEntryState(getState())).not.toBeUndefined();
    expect(getFormEntryState(getState())?.item_id).toBe(
      mockedApi.responseProvider.eventFiltersGetOne.getMockImplementation()!().item_id
    );
  });

  it('should not display banner when platinum license', async () => {
    await act(async () => {
      component = render({ id: 'fakeId', type: 'edit' });
      await waitForAction('eventFiltersInitFromId');
    });

    expect(component.queryByTestId('expired-license-callout')).toBeNull();
  });

  it('should not display banner when under platinum license and create mode', async () => {
    component = render();
    expect(component.queryByTestId('expired-license-callout')).toBeNull();
  });

  it('should not display banner when under platinum license and edit mode with global assignment', async () => {
    mockedApi.responseProvider.eventFiltersGetOne.mockReturnValue({
      ...getExceptionListItemSchemaMock(),
      tags: ['policy:all'],
    });
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(false);
    await act(async () => {
      component = render({ id: 'fakeId', type: 'edit' });
      await waitForAction('eventFiltersInitFromId');
    });

    expect(component.queryByTestId('expired-license-callout')).toBeNull();
  });

  it('should display banner when under platinum license and edit mode with by policy assignment', async () => {
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(false);
    await act(async () => {
      component = render({ id: 'fakeId', type: 'edit' });
      await waitForAction('eventFiltersInitFromId');
    });

    expect(component.queryByTestId('expired-license-callout')).not.toBeNull();
  });
});
