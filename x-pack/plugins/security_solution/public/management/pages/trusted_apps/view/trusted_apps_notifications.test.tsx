/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';

import { NotificationsStart } from 'kibana/public';

import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { KibanaContextProvider } from '../../../../../../../../src/plugins/kibana_react/public/context';

import {
  createGlobalNoMiddlewareStore,
  createSampleTrustedApp,
  createServerApiError,
} from '../test_utils';

import { TrustedAppsNotifications } from './trusted_apps_notifications';

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

  return render(<TrustedAppsNotifications />, { wrapper: Wrapper });
};

describe('TrustedAppsNotifications', () => {
  it('renders correctly initially', () => {
    const notifications = mockNotifications();

    renderNotifications(createGlobalNoMiddlewareStore(), notifications);

    expect(notifications.toasts.addSuccess).not.toBeCalled();
    expect(notifications.toasts.addDanger).not.toBeCalled();
  });

  it('shows success notification when deletion successful', () => {
    const store = createGlobalNoMiddlewareStore();
    const notifications = mockNotifications();

    renderNotifications(store, notifications);

    store.dispatch({
      type: 'trustedAppDeletionDialogStarted',
      payload: { entry: createSampleTrustedApp(3) },
    });
    store.dispatch({
      type: 'trustedAppDeletionSubmissionResourceStateChanged',
      payload: { newState: { type: 'LoadedResourceState', data: null } },
    });
    store.dispatch({
      type: 'trustedAppDeletionDialogClosed',
    });

    expect(notifications.toasts.addSuccess).toBeCalledWith({
      text: '"trusted app 3" has been removed from the trusted applications list.',
      title: 'Successfully removed',
    });
    expect(notifications.toasts.addDanger).not.toBeCalled();
  });

  it('shows error notification when deletion fails', () => {
    const store = createGlobalNoMiddlewareStore();
    const notifications = mockNotifications();

    renderNotifications(store, notifications);

    store.dispatch({
      type: 'trustedAppDeletionDialogStarted',
      payload: { entry: createSampleTrustedApp(3) },
    });
    store.dispatch({
      type: 'trustedAppDeletionSubmissionResourceStateChanged',
      payload: {
        newState: { type: 'FailedResourceState', error: createServerApiError('Not Found') },
      },
    });

    expect(notifications.toasts.addSuccess).not.toBeCalled();
    expect(notifications.toasts.addDanger).toBeCalledWith({
      text: 'Unable to remove "trusted app 3" from the trusted applications list. Reason: Not Found',
      title: 'Removal failure',
    });
  });
});
