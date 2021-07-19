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

import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { EventFiltersHttpService } from '../../../service';
import { createdEventFilterEntryMock } from '../../../test_utils';
import { getFormEntryState, isUninitialisedForm } from '../../../store/selector';
import { EventFiltersListPageState } from '../../../types';

jest.mock('../form');
jest.mock('../../../service');

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
let render: (
  props?: Partial<EventFiltersFlyoutProps>
) => ReturnType<AppContextTestRender['render']>;
const act = reactTestingLibrary.act;
let onCancelMock: jest.Mock;
const EventFiltersHttpServiceMock = EventFiltersHttpService as jest.Mock;
let getState: () => EventFiltersListPageState;

describe('Event filter flyout', () => {
  beforeAll(() => {
    EventFiltersHttpServiceMock.mockImplementation(() => {
      return {
        getOne: () => createdEventFilterEntryMock(),
        addEventFilters: () => createdEventFilterEntryMock(),
        updateOne: () => createdEventFilterEntryMock(),
      };
    });
  });
  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    waitForAction = mockedContext.middlewareSpy.waitForAction;
    onCancelMock = jest.fn();
    getState = () => mockedContext.store.getState().management.eventFilters;
    render = (props) =>
      mockedContext.render(<EventFiltersFlyout {...props} onCancel={onCancelMock} />);
  });

  afterEach(() => reactTestingLibrary.cleanup());

  it('should renders correctly', () => {
    const component = render();
    expect(component.getAllByText('Add event filter')).not.toBeNull();
    expect(component.getByText('Cancel')).not.toBeNull();
  });

  it('should dispatch action to init form store on mount', async () => {
    await act(async () => {
      render();
      await waitForAction('eventFiltersInitForm');
    });

    expect(getFormEntryState(getState())).not.toBeUndefined();
    expect(getFormEntryState(getState())!.entries[0].field).toBe('');
  });

  it('should confirm form when button is disabled', () => {
    const component = render();
    const confirmButton = component.getByTestId('add-exception-confirm-button');
    act(() => {
      fireEvent.click(confirmButton);
    });
    expect(isUninitialisedForm(getState())).toBeTruthy();
  });

  it('should confirm form when button is enabled', async () => {
    const component = render();
    mockedContext.store.dispatch({
      type: 'eventFiltersChangeForm',
      payload: {
        entry: {
          ...(getState().form!.entry as CreateExceptionListItemSchema),
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
          data: getState().form!.entry as ExceptionListItemSchema,
        },
      });
    });

    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it('should close when click on cancel button', () => {
    const component = render();
    const cancelButton = component.getByText('Cancel');
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

    const cancelButton = component.getByText('Cancel');
    expect(onCancelMock).toHaveBeenCalledTimes(0);

    act(() => {
      fireEvent.click(cancelButton);
    });

    expect(onCancelMock).toHaveBeenCalledTimes(0);
  });

  it('should renders correctly when id and edit type', () => {
    const component = render({ id: 'fakeId', type: 'edit' });

    expect(component.getAllByText('Update event filter')).not.toBeNull();
    expect(component.getByText('Cancel')).not.toBeNull();
  });

  it('should dispatch action to init form store on mount with id', async () => {
    await act(async () => {
      render({ id: 'fakeId', type: 'edit' });
      await waitForAction('eventFiltersInitFromId');
    });

    expect(getFormEntryState(getState())).not.toBeUndefined();
    expect(getFormEntryState(getState())!.item_id).toBe(createdEventFilterEntryMock().item_id);
  });
});
