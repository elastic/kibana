/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { render, act } from '@testing-library/react';

import { NotificationsStart } from 'kibana/public';
import { Ecs } from '../../../../../../../common/ecs';
import { coreMock } from '../../../../../../../../../../src/core/public/mocks';
import { KibanaContextProvider } from '../../../../../../../../../../src/plugins/kibana_react/public/context';
import {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '../../../../../../../public/shared_imports';

import { createGlobalNoMiddlewareStore } from '../../../test_utils';
import { EventFilterNotification } from '.';
import { getCreationErrorMessage, getCreationSuccessMessage } from './translations';
import { getInitialExceptionFromEvent } from '../../../store/utils';
import {
  getLastLoadedResourceState,
  FailedResourceState,
} from '../../../../../state/async_resource_state';

const mockNotifications = () => coreMock.createStart({ basePath: '/mock' }).notifications;

const event: Ecs = {
  _id: 'unLfz3gB2mJZsMY3ytx3',
  timestamp: '2021-04-14T15:34:15.330Z',
  _index: '.ds-logs-endpoint.events.process-default-2021.04.12-000001',
  event: {
    category: ['network'],
    id: ['2c4f51be-7736-4ab8-a255-54e7023c4653'],
    kind: ['event'],
    type: ['start'],
  },
  host: {
    name: ['Host-tvs68wo3qc'],
    os: {
      family: ['windows'],
    },
    id: ['a563b365-2bee-40df-adcd-ae84d889f523'],
    ip: ['10.242.233.187'],
  },
  user: {
    name: ['uegem17ws4'],
    domain: ['hr8jofpkxp'],
  },
  agent: {
    type: ['endpoint'],
  },
  process: {
    hash: {
      md5: ['c4653870-99b8-4f36-abde-24812d08a289'],
    },
    parent: {
      pid: [4852],
    },
    pid: [3652],
    name: ['lsass.exe'],
    args: ['"C:\\lsass.exe" \\6z9'],
    entity_id: ['9qotd1i8rf'],
    executable: ['C:\\lsass.exe'],
  },
};

const renderNotifications = (
  store: ReturnType<typeof createGlobalNoMiddlewareStore>,
  notifications: NotificationsStart
) => {
  const Wrapper: React.FC = ({ children }) => (
    <Provider store={store}>
      <KibanaContextProvider services={{ notifications }}>{children}</KibanaContextProvider>
    </Provider>
  );

  return render(<EventFilterNotification />, { wrapper: Wrapper });
};

describe('EventFilterNotification', () => {
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
      const entry = getInitialExceptionFromEvent(event);
      store.dispatch({
        type: 'eventFilterInitForm',
        payload: { entry },
      });
    });

    act(() => {
      store.dispatch({
        type: 'eventFilterFormStateChanged',
        payload: {
          type: 'LoadedResourceState',
          data: store.getState()!.management!.eventFilter!.form!.entry as ExceptionListItemSchema,
        },
      });
    });

    expect(notifications.toasts.addSuccess).toBeCalledWith(
      getCreationSuccessMessage(
        store.getState()!.management!.eventFilter!.form!.entry as CreateExceptionListItemSchema
      )
    );
    expect(notifications.toasts.addDanger).not.toBeCalled();
  });

  it('shows error notification when creation fails', () => {
    const store = createGlobalNoMiddlewareStore();
    const notifications = mockNotifications();

    renderNotifications(store, notifications);

    act(() => {
      const entry = getInitialExceptionFromEvent(event);
      store.dispatch({
        type: 'eventFilterInitForm',
        payload: { entry },
      });
    });

    act(() => {
      store.dispatch({
        type: 'eventFilterFormStateChanged',
        payload: {
          type: 'FailedResourceState',
          error: { message: 'error message', statusCode: 500, error: 'error' },
          lastLoadedState: getLastLoadedResourceState(
            store.getState()!.management!.eventFilter!.form!.submissionResourceState
          ),
        },
      });
    });

    expect(notifications.toasts.addSuccess).not.toBeCalled();
    expect(notifications.toasts.addDanger).toBeCalledWith(
      getCreationErrorMessage(
        (store.getState()!.management!.eventFilter!.form!
          .submissionResourceState as FailedResourceState).error
      )
    );
  });
});
