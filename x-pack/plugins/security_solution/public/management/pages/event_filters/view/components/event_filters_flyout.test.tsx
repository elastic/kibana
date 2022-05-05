/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EventFiltersFlyout, EventFiltersFlyoutProps } from './event_filters_flyout';
import { act, cleanup, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../common/mock/endpoint';

import { sendGetEndpointSpecificPackagePolicies } from '../../../../services/policies/policies';
import { sendGetEndpointSpecificPackagePoliciesMock } from '../../../../services/policies/test_mock_utils';

import { ecsEventMock, esResponseData, eventFiltersListQueryHttpMock } from '../../test_utils';

import { useKibana } from '../../../../../common/lib/kibana';
import { licenseService } from '../../../../../common/hooks/use_license';
import { of } from 'rxjs';

jest.mock('../../../../../common/lib/kibana');
jest.mock('./form');
jest.mock('../../../../services/policies/policies');
jest.mock('../../../../../common/hooks/use_license', () => {
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

let component: RenderResult;
let mockedContext: AppContextTestRender;
let render: (
  props?: Partial<EventFiltersFlyoutProps>
) => ReturnType<AppContextTestRender['render']>;
let onCancelMock: jest.Mock;
let mockedApi: ReturnType<typeof eventFiltersListQueryHttpMock>;

describe('Event filter flyout', () => {
  beforeEach(() => {
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(true);
    mockedContext = createAppRootMockRenderer();
    onCancelMock = jest.fn();
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

  afterEach(() => cleanup());

  it('should render correctly', () => {
    component = render();
    expect(component.getAllByText('Add event filter')).not.toBeNull();
    expect(component.getByText('Cancel')).not.toBeNull();
  });

  it('should render correctly with data ', async () => {
    await act(async () => {
      component = render({ data: ecsEventMock() });
    });

    expect(component.getAllByText('Add endpoint event filter')).not.toBeNull();
    expect(component.getByText('Cancel')).not.toBeNull();
  });

  it('should update add event filter button state', async () => {
    component = render();
    const confirmButton = component.getByTestId('add-exception-confirm-button');
    expect(confirmButton.hasAttribute('disabled')).toBeTruthy();

    // mock isValid:true
    expect(confirmButton.hasAttribute('disabled')).toBeFalsy();
  });

  it('should close when exception has been submitted successfully and close flyout', () => {
    render();
    expect(onCancelMock).toHaveBeenCalledTimes(0);

    // mock API submit
    mockedApi.responseProvider.eventFiltersCreateOne();
    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it('should close when click on cancel button', () => {
    component = render();
    const cancelButton = component.getByTestId('cancelExceptionAddButton');
    expect(onCancelMock).toHaveBeenCalledTimes(0);

    userEvent.click(cancelButton);
    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it('should prevent close when submitting data', async () => {
    component = render();

    const cancelButton = component.getByTestId('cancelExceptionAddButton');
    expect(onCancelMock).toHaveBeenCalledTimes(0);

    // mock submitting data
    userEvent.click(cancelButton);
    expect(onCancelMock).toHaveBeenCalledTimes(0);
  });
});
