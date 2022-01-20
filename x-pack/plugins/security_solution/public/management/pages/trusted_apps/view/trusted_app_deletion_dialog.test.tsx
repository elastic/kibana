/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import {
  createGlobalNoMiddlewareStore,
  createSampleTrustedApp,
  createServerApiError,
} from '../test_utils';

import {
  TrustedAppDeletionDialogStarted,
  TrustedAppDeletionSubmissionResourceStateChanged,
} from '../store/action';

import { TrustedAppDeletionDialog } from './trusted_app_deletion_dialog';

const renderDeletionDialog = (store: ReturnType<typeof createGlobalNoMiddlewareStore>) => {
  const Wrapper: React.FC = ({ children }) => (
    <Provider store={store}>
      <I18nProvider>{children}</I18nProvider>
    </Provider>
  );

  return render(<TrustedAppDeletionDialog />, { wrapper: Wrapper });
};

const createDialogStartAction = (): TrustedAppDeletionDialogStarted => ({
  type: 'trustedAppDeletionDialogStarted',
  payload: { entry: createSampleTrustedApp(3) },
});

const createDialogLoadingAction = (): TrustedAppDeletionSubmissionResourceStateChanged => ({
  type: 'trustedAppDeletionSubmissionResourceStateChanged',
  payload: {
    newState: {
      type: 'LoadingResourceState',
      previousState: { type: 'UninitialisedResourceState' },
    },
  },
});

const createDialogFailedAction = (): TrustedAppDeletionSubmissionResourceStateChanged => ({
  type: 'trustedAppDeletionSubmissionResourceStateChanged',
  payload: {
    newState: { type: 'FailedResourceState', error: createServerApiError('Not Found') },
  },
});

describe('TrustedAppDeletionDialog', () => {
  it('renders correctly initially', () => {
    expect(renderDeletionDialog(createGlobalNoMiddlewareStore()).baseElement).toMatchSnapshot();
  });

  it('renders correctly when dialog started', () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(createDialogStartAction());

    expect(renderDeletionDialog(store).baseElement).toMatchSnapshot();
  });

  it('renders correctly when deletion is in progress', () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(createDialogStartAction());
    store.dispatch(createDialogLoadingAction());

    expect(renderDeletionDialog(store).baseElement).toMatchSnapshot();
  });

  it('renders correctly when deletion failed', () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(createDialogStartAction());
    store.dispatch(createDialogFailedAction());

    expect(renderDeletionDialog(store).baseElement).toMatchSnapshot();
  });

  it('triggers confirmation action when confirm button clicked', async () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(createDialogStartAction());
    store.dispatch = jest.fn();

    (await renderDeletionDialog(store).findByTestId('trustedAppDeletionConfirm')).click();

    expect(store.dispatch).toBeCalledWith({
      type: 'trustedAppDeletionDialogConfirmed',
    });
  });

  it('triggers closing action when cancel button clicked', async () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(createDialogStartAction());
    store.dispatch = jest.fn();

    (await renderDeletionDialog(store).findByTestId('trustedAppDeletionCancel')).click();

    expect(store.dispatch).toBeCalledWith({
      type: 'trustedAppDeletionDialogClosed',
    });
  });

  it('does not trigger closing action when deletion in progress and cancel button clicked', async () => {
    const store = createGlobalNoMiddlewareStore();

    store.dispatch(createDialogStartAction());
    store.dispatch(createDialogLoadingAction());

    store.dispatch = jest.fn();

    (await renderDeletionDialog(store).findByTestId('trustedAppDeletionCancel')).click();

    expect(store.dispatch).not.toBeCalled();
  });
});
