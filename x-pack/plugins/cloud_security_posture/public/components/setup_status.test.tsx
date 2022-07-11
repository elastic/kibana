/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Chance from 'chance';
import { useCisKubernetesIntegration } from '../common/api/use_cis_kubernetes_integration';
import {
  DEFAULT_NO_DATA_TEST_SUBJECT,
  ERROR_STATE_TEST_SUBJECT,
  isCommonError,
  LOADING_STATE_TEST_SUBJECT,
  PACKAGE_NOT_INSTALLED_TEST_SUBJECT,
} from './setup_status';
import { createReactQueryResponse } from '../test/fixtures/react_query';
import { TestProvider } from '../test/test_provider';
import { coreMock } from '@kbn/core/public/mocks';
import { render, screen } from '@testing-library/react';
import React, { ComponentProps } from 'react';
import { UseQueryResult } from 'react-query';
import { SetupStatus } from './setup_status';
import { NoDataPage } from '@kbn/kibana-react-plugin/public';

const chance = new Chance();
jest.mock('../common/api/use_cis_kubernetes_integration');

describe('<SetupStatus />', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // if package installation status is 'not_installed', SetupStatus will render a noDataConfig prompt
    (useCisKubernetesIntegration as jest.Mock).mockImplementation(() => ({
      isSuccess: true,
      isLoading: false,
      data: { item: { status: 'installed' } },
    }));
  });

  const renderSetupStatus = (props: ComponentProps<typeof SetupStatus> = { children: null }) => {
    const mockCore = coreMock.createStart();

    render(
      <TestProvider
        core={{
          ...mockCore,
          application: {
            ...mockCore.application,
            capabilities: {
              ...mockCore.application.capabilities,
              // This is required so that the `noDataConfig` view will show the action button
              navLinks: { integrations: true },
            },
          },
        }}
      >
        <SetupStatus {...props} />
      </TestProvider>
    );
  };

  it('renders children if integration is installed', () => {
    const children = chance.sentence();
    renderSetupStatus({ children });

    expect(screen.getByText(children)).toBeInTheDocument();
    expect(screen.queryByTestId(LOADING_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('renders integrations installation prompt if integration is not installed', () => {
    (useCisKubernetesIntegration as jest.Mock).mockImplementation(() => ({
      isSuccess: true,
      isLoading: false,
      data: { item: { status: 'not_installed' } },
    }));

    const children = chance.sentence();
    renderSetupStatus({ children });

    expect(screen.getByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(LOADING_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('renders default loading state when the integration query is loading', () => {
    (useCisKubernetesIntegration as jest.Mock).mockImplementation(
      () =>
        createReactQueryResponse({
          status: 'loading',
        }) as unknown as UseQueryResult
    );

    const children = chance.sentence();
    renderSetupStatus({ children });

    expect(screen.getByTestId(LOADING_STATE_TEST_SUBJECT)).toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('renders default error state when the integration query has an error', () => {
    (useCisKubernetesIntegration as jest.Mock).mockImplementation(
      () =>
        createReactQueryResponse({
          status: 'error',
          error: new Error('error'),
        }) as unknown as UseQueryResult
    );

    const children = chance.sentence();
    renderSetupStatus({ children });

    expect(screen.getByTestId(ERROR_STATE_TEST_SUBJECT)).toBeInTheDocument();
    expect(screen.queryByTestId(LOADING_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('renders default loading text when query isLoading', () => {
    const query = createReactQueryResponse({
      status: 'loading',
    }) as unknown as UseQueryResult;

    const children = chance.sentence();
    renderSetupStatus({ children, query });

    expect(screen.getByTestId(LOADING_STATE_TEST_SUBJECT)).toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('renders default loading text when query is idle', () => {
    const query = createReactQueryResponse({
      status: 'idle',
    }) as unknown as UseQueryResult;

    const children = chance.sentence();
    renderSetupStatus({ children, query });

    expect(screen.getByTestId(LOADING_STATE_TEST_SUBJECT)).toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('renders default error texts when query isError', () => {
    const error = chance.sentence();
    const message = chance.sentence();
    const statusCode = chance.integer();

    const query = createReactQueryResponse({
      status: 'error',
      error: {
        body: {
          error,
          message,
          statusCode,
        },
      },
    }) as unknown as UseQueryResult;

    const children = chance.sentence();
    renderSetupStatus({ children, query });

    [error, message, statusCode].forEach((text) =>
      expect(screen.getByText(text, { exact: false })).toBeInTheDocument()
    );
    expect(screen.getByTestId(ERROR_STATE_TEST_SUBJECT)).toBeInTheDocument();
    expect(screen.queryByTestId(LOADING_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('prefers custom error render', () => {
    const error = chance.sentence();
    const message = chance.sentence();
    const statusCode = chance.integer();

    const query = createReactQueryResponse({
      status: 'error',
      error: {
        body: {
          error,
          message,
          statusCode,
        },
      },
    }) as unknown as UseQueryResult;

    const children = chance.sentence();
    renderSetupStatus({
      children,
      query,
      errorRender: (err) => <div>{isCommonError(err) && err.body.message}</div>,
    });

    expect(screen.getByText(message)).toBeInTheDocument();
    [error, statusCode].forEach((text) => expect(screen.queryByText(text)).not.toBeInTheDocument());
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(LOADING_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('prefers custom loading render', () => {
    const loading = chance.sentence();

    const query = createReactQueryResponse({
      status: 'loading',
    }) as unknown as UseQueryResult;

    const children = chance.sentence();
    renderSetupStatus({
      children,
      query,
      loadingRender: () => <div>{loading}</div>,
    });

    expect(screen.getByText(loading)).toBeInTheDocument();
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(LOADING_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('renders no data prompt when query data is undefined', () => {
    const query = createReactQueryResponse({
      status: 'success',
      data: undefined,
    }) as unknown as UseQueryResult;

    const children = chance.sentence();
    renderSetupStatus({ children, query });

    expect(screen.getByTestId(DEFAULT_NO_DATA_TEST_SUBJECT)).toBeInTheDocument();
    expect(screen.queryByTestId(LOADING_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });

  it('prefers custom no data prompt', () => {
    const pageTitle = chance.sentence();
    const solution = chance.sentence();
    const docsLink = chance.sentence();
    const noDataRenderer = () => (
      <NoDataPage pageTitle={pageTitle} solution={solution} docsLink={docsLink} actions={{}} />
    );

    const query = createReactQueryResponse({
      status: 'success',
      data: undefined,
    }) as unknown as UseQueryResult;

    const children = chance.sentence();
    renderSetupStatus({
      children,
      query,
      noDataRenderer,
    });

    expect(screen.getByText(pageTitle)).toBeInTheDocument();
    expect(screen.getAllByText(solution, { exact: false })[0]).toBeInTheDocument();
    expect(screen.queryByTestId(LOADING_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByTestId(ERROR_STATE_TEST_SUBJECT)).not.toBeInTheDocument();
    expect(screen.queryByTestId(PACKAGE_NOT_INSTALLED_TEST_SUBJECT)).not.toBeInTheDocument();
  });
});
