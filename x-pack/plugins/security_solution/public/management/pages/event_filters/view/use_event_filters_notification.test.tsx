/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { renderHook, act } from '@testing-library/react-hooks';

import { NotificationsStart } from 'kibana/public';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { KibanaContextProvider } from '../../../../../../../../src/plugins/kibana_react/public/context';
import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import {
  createdEventFilterEntryMock,
  createGlobalNoMiddlewareStore,
  ecsEventMock,
} from '../test_utils';
import { useEventFiltersNotification } from './hooks';
import {
  getCreationErrorMessage,
  getCreationSuccessMessage,
  getGetErrorMessage,
  getUpdateSuccessMessage,
  getUpdateErrorMessage,
} from './translations';
import { getInitialExceptionFromEvent } from '../store/utils';
import {
  getLastLoadedResourceState,
  FailedResourceState,
} from '../../../state/async_resource_state';

const mockNotifications = () => coreMock.createStart({ basePath: '/mock' }).notifications;

const renderNotifications = (
  store: ReturnType<typeof createGlobalNoMiddlewareStore>,
  notifications: NotificationsStart
) => {
  const Wrapper: React.FC = ({ children }) => (
    <Provider store={store}>
      <KibanaContextProvider services={{ notifications }}>{children}</KibanaContextProvider>
    </Provider>
  );
  return renderHook(useEventFiltersNotification, { wrapper: Wrapper });
};

describe('EventFiltersNotification', () => {
  it('renders correctly initially', () => {
    const notifications = mockNotifications();

    renderNotifications(createGlobalNoMiddlewareStore(), notifications);

    expect(notifications.toasts.addSuccess).not.toBeCalled();
    expect(notifications.toasts.addDanger).not.toBeCalled();
  });

  it('shows success notification when creation successful', () => {
    const store = createGlobalNoMiddlewareStore();
    const notifications = mockNotifications();

    renderNotifications(store, notifications);

    act(() => {
      const entry = getInitialExceptionFromEvent(ecsEventMock());
      store.dispatch({
        type: 'eventFiltersInitForm',
        payload: { entry },
      });
    });

    act(() => {
      store.dispatch({
        type: 'eventFiltersFormStateChanged',
        payload: {
          type: 'LoadedResourceState',
          data: store.getState().management.eventFilters.form.entry as ExceptionListItemSchema,
        },
      });
    });

    expect(notifications.toasts.addSuccess).toBeCalledWith(
      getCreationSuccessMessage(
        store.getState().management.eventFilters.form.entry as CreateExceptionListItemSchema
      )
    );
    expect(notifications.toasts.addDanger).not.toBeCalled();
  });

  it('shows success notification when update successful', () => {
    const store = createGlobalNoMiddlewareStore();
    const notifications = mockNotifications();

    renderNotifications(store, notifications);

    act(() => {
      store.dispatch({
        type: 'eventFiltersInitForm',
        payload: { entry: createdEventFilterEntryMock() },
      });
    });

    act(() => {
      store.dispatch({
        type: 'eventFiltersFormStateChanged',
        payload: {
          type: 'LoadedResourceState',
          data: store.getState().management.eventFilters.form.entry as ExceptionListItemSchema,
        },
      });
    });

    expect(notifications.toasts.addSuccess).toBeCalledWith(
      getUpdateSuccessMessage(
        store.getState().management.eventFilters.form.entry as CreateExceptionListItemSchema
      )
    );
    expect(notifications.toasts.addDanger).not.toBeCalled();
  });

  it('shows error notification when creation fails', () => {
    const store = createGlobalNoMiddlewareStore();
    const notifications = mockNotifications();

    renderNotifications(store, notifications);

    act(() => {
      const entry = getInitialExceptionFromEvent(ecsEventMock());
      store.dispatch({
        type: 'eventFiltersInitForm',
        payload: { entry },
      });
    });

    act(() => {
      store.dispatch({
        type: 'eventFiltersFormStateChanged',
        payload: {
          type: 'FailedResourceState',
          error: { message: 'error message', statusCode: 500, error: 'error' },
          lastLoadedState: getLastLoadedResourceState(
            store.getState().management.eventFilters.form.submissionResourceState
          ),
        },
      });
    });

    expect(notifications.toasts.addSuccess).not.toBeCalled();
    expect(notifications.toasts.addDanger).toBeCalledWith(
      getCreationErrorMessage(
        (
          store.getState().management.eventFilters.form
            .submissionResourceState as FailedResourceState
        ).error
      )
    );
  });

  it('shows error notification when update fails', () => {
    const store = createGlobalNoMiddlewareStore();
    const notifications = mockNotifications();

    renderNotifications(store, notifications);

    act(() => {
      store.dispatch({
        type: 'eventFiltersInitForm',
        payload: { entry: createdEventFilterEntryMock() },
      });
    });

    act(() => {
      store.dispatch({
        type: 'eventFiltersFormStateChanged',
        payload: {
          type: 'FailedResourceState',
          error: { message: 'error message', statusCode: 500, error: 'error' },
          lastLoadedState: getLastLoadedResourceState(
            store.getState().management.eventFilters.form.submissionResourceState
          ),
        },
      });
    });

    expect(notifications.toasts.addSuccess).not.toBeCalled();
    expect(notifications.toasts.addDanger).toBeCalledWith(
      getUpdateErrorMessage(
        (
          store.getState().management.eventFilters.form
            .submissionResourceState as FailedResourceState
        ).error
      )
    );
  });

  it('shows error notification when get fails', () => {
    const store = createGlobalNoMiddlewareStore();
    const notifications = mockNotifications();

    renderNotifications(store, notifications);

    act(() => {
      store.dispatch({
        type: 'eventFiltersFormStateChanged',
        payload: {
          type: 'FailedResourceState',
          error: { message: 'error message', statusCode: 500, error: 'error' },
          lastLoadedState: getLastLoadedResourceState(
            store.getState().management.eventFilters.form.submissionResourceState
          ),
        },
      });
    });

    expect(notifications.toasts.addSuccess).not.toBeCalled();
    expect(notifications.toasts.addWarning).toBeCalledWith(
      getGetErrorMessage(
        (
          store.getState().management.eventFilters.form
            .submissionResourceState as FailedResourceState
        ).error
      )
    );
  });
});
