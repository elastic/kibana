/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EventFiltersFlyout } from '.';
import * as reactTestingLibrary from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { MiddlewareActionSpyHelper } from '../../../../../../common/store/test_utils';

import {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '../../../../../../shared_imports';

jest.mock('../form');
jest.mock('../../hooks', () => {
  const originalModule = jest.requireActual('../../hooks');
  const useEventFiltersNotification = jest.fn().mockImplementation(() => {});

  return {
    ...originalModule,
    useEventFiltersNotification,
  };
});

let mockedContext: AppContextTestRender;
let waitForAction: MiddlewareActionSpyHelper['waitForAction'];
let render: () => ReturnType<AppContextTestRender['render']>;
const act = reactTestingLibrary.act;
let onCancelMock: jest.Mock;

describe('Event filter flyout', () => {
  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    waitForAction = mockedContext.middlewareSpy.waitForAction;
    onCancelMock = jest.fn();
    render = () => mockedContext.render(<EventFiltersFlyout onCancel={onCancelMock} />);
  });

  afterEach(() => reactTestingLibrary.cleanup());

  it('should renders correctly', () => {
    const component = render();
    expect(component.getAllByText('Add Endpoint Event Filter')).not.toBeNull();
    expect(component.getByText('cancel')).not.toBeNull();
    expect(component.getByText('Endpoint Security')).not.toBeNull();
  });

  it('should dispatch action to init form store on mount', async () => {
    await act(async () => {
      render();
      await waitForAction('eventFiltersInitForm');
    });

    expect(mockedContext.store.getState().management.eventFilters.form.entry).not.toBeUndefined();
    expect(
      mockedContext.store.getState().management.eventFilters.form.entry!.entries[0].field
    ).toBe('');
  });

  it('should confirm form when button is disabled', () => {
    const component = render();
    const confirmButton = component.getByTestId('add-exception-confirm-button');
    act(() => {
      fireEvent.click(confirmButton);
    });
    expect(
      mockedContext.store.getState().management.eventFilters.form.submissionResourceState.type
    ).toBe('UninitialisedResourceState');
  });

  it('should confirm form when button is enabled', async () => {
    const component = render();
    mockedContext.store.dispatch({
      type: 'eventFiltersChangeForm',
      payload: {
        entry: {
          ...(mockedContext.store.getState().management.eventFilters.form!
            .entry as CreateExceptionListItemSchema),
          name: 'test',
          os_types: ['windows'],
        },
        hasNameError: false,
        hasOSError: false,
      },
    });
    const confirmButton = component.getByTestId('add-exception-confirm-button');

    await act(async () => {
      fireEvent.click(confirmButton);
      await waitForAction('eventFiltersCreateSuccess');
    });
    expect(
      mockedContext.store.getState().management.eventFilters.form.submissionResourceState.type
    ).toBe('UninitialisedResourceState');
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
          data: mockedContext.store.getState().management.eventFilters.form!
            .entry as ExceptionListItemSchema,
        },
      });
    });

    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it('should close when click on cancel button', () => {
    const component = render();
    const cancelButton = component.getByText('cancel');
    expect(onCancelMock).toHaveBeenCalledTimes(0);

    act(() => {
      fireEvent.click(cancelButton);
    });

    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it('should close when close flyout', () => {
    const component = render();
    const flyoutCloseButton = component.getByTestId('euiFlyoutCloseButton');
    expect(onCancelMock).toHaveBeenCalledTimes(0);

    act(() => {
      fireEvent.click(flyoutCloseButton);
    });

    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it('should prevent close when is loading action', () => {
    const component = render();
    act(() => {
      mockedContext.store.dispatch({
        type: 'eventFiltersFormStateChanged',
        payload: {
          type: 'LoadingResourceState',
          previousState: { type: 'UninitialisedResourceState' },
        },
      });
    });

    const cancelButton = component.getByText('cancel');
    expect(onCancelMock).toHaveBeenCalledTimes(0);

    act(() => {
      fireEvent.click(cancelButton);
    });

    expect(onCancelMock).toHaveBeenCalledTimes(0);
  });
});
