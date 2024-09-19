/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EventFiltersModal } from '.';
import { RenderResult, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { ecsEventMock, esResponseData } from '../../../test_utils';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { MiddlewareActionSpyHelper } from '../../../../../../common/store/test_utils';

import { MODAL_TITLE, MODAL_SUBTITLE, ACTIONS_CONFIRM, ACTIONS_CANCEL } from './translations';
import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { useKibana } from '../../../../../../common/lib/kibana';
import { EventFiltersListPageState } from '../../../types';

jest.mock('../../../../../../common/lib/kibana');
jest.mock('../form');
jest.mock('../../hooks', () => {
  const originalModule = jest.requireActual('../../hooks');
  const useEventFiltersNotification = jest.fn().mockImplementation(() => {});

  return {
    ...originalModule,
    useEventFiltersNotification,
  };
});

describe('Event filter modal', () => {
  let component: RenderResult;
  let onCancelMock: jest.Mock;
  let mockedContext: AppContextTestRender;
  let waitForAction: MiddlewareActionSpyHelper['waitForAction'];
  let render: () => ReturnType<AppContextTestRender['render']>;
  let getState: () => EventFiltersListPageState;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    waitForAction = mockedContext.middlewareSpy.waitForAction;
    onCancelMock = jest.fn();
    getState = () => mockedContext.store.getState().management.eventFilters;
    render = () =>
      mockedContext.render(<EventFiltersModal data={ecsEventMock()} onCancel={onCancelMock} />);
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: {},
        data: {
          search: {
            search: jest.fn().mockImplementation(() => ({ toPromise: () => esResponseData() })),
          },
        },
        notifications: {},
      },
    });
  });

  it('should renders correctly', async () => {
    await act(async () => {
      component = render();
      await waitForAction('eventFiltersInitForm');
    });

    expect(component.getAllByText(MODAL_TITLE)).not.toBeNull();
    expect(component.getByText(MODAL_SUBTITLE)).not.toBeNull();
    expect(component.getAllByText(ACTIONS_CONFIRM)).not.toBeNull();
    expect(component.getByText(ACTIONS_CANCEL)).not.toBeNull();
  });

  it('should dispatch action to init form store on mount', async () => {
    await act(async () => {
      component = render();
      await waitForAction('eventFiltersInitForm');
    });

    expect(getState().form!.entry).not.toBeUndefined();
  });

  it('should set OS with the enriched data', async () => {
    await act(async () => {
      component = render();
      await waitForAction('eventFiltersInitForm');
    });

    expect(getState().form!.entry?.os_types).toContain('linux');
  });

  it('should confirm form when button is disabled', async () => {
    await act(async () => {
      component = render();
      await waitForAction('eventFiltersInitForm');
    });

    const confirmButton = component.getByTestId('add-exception-confirm-button');
    act(() => {
      fireEvent.click(confirmButton);
    });
    expect(getState().form!.submissionResourceState.type).toBe('UninitialisedResourceState');
  });

  it('should confirm form when button is enabled', async () => {
    await act(async () => {
      component = render();
      await waitForAction('eventFiltersInitForm');
    });

    mockedContext.store.dispatch({
      type: 'eventFiltersChangeForm',
      payload: {
        entry: {
          ...(getState().form!.entry as CreateExceptionListItemSchema),
          name: 'test',
        },
        hasNameError: false,
      },
    });
    const confirmButton = component.getByTestId('add-exception-confirm-button');
    act(() => {
      fireEvent.click(confirmButton);
    });
    expect(getState().form!.submissionResourceState.type).toBe('LoadingResourceState');
    expect(confirmButton.hasAttribute('disabled')).toBeTruthy();
  });

  it('should close when exception has been submitted correctly', async () => {
    await act(async () => {
      component = render();
      await waitForAction('eventFiltersInitForm');
    });

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

  it('should close when click on cancel button', async () => {
    await act(async () => {
      component = render();
      await waitForAction('eventFiltersInitForm');
    });

    const cancelButton = component.getByText(ACTIONS_CANCEL);
    expect(onCancelMock).toHaveBeenCalledTimes(0);

    act(() => {
      fireEvent.click(cancelButton);
    });

    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it('should close when close modal', async () => {
    await act(async () => {
      component = render();
      await waitForAction('eventFiltersInitForm');
    });

    const modalCloseButton = component.getByLabelText('Closes this modal window');
    expect(onCancelMock).toHaveBeenCalledTimes(0);

    act(() => {
      fireEvent.click(modalCloseButton);
    });

    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it('should prevent close when is loading action', async () => {
    await act(async () => {
      component = render();
      await waitForAction('eventFiltersInitForm');
    });

    act(() => {
      mockedContext.store.dispatch({
        type: 'eventFiltersFormStateChanged',
        payload: {
          type: 'LoadingResourceState',
          previousState: { type: 'UninitialisedResourceState' },
        },
      });
    });

    const cancelButton = component.getByText(ACTIONS_CANCEL);
    expect(onCancelMock).toHaveBeenCalledTimes(0);

    act(() => {
      fireEvent.click(cancelButton);
    });

    expect(onCancelMock).toHaveBeenCalledTimes(0);
  });
});
