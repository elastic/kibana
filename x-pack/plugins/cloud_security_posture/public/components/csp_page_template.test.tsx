/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import Chance from 'chance';
import { coreMock } from '../../../../../src/core/public/mocks';
import { createNavigationItemFixture } from '../test/fixtures/navigation_item';
import { createReactQueryResponse } from '../test/fixtures/react_query';
import { TestProvider } from '../test/test_provider';
import { CspPageTemplate, getSideNavItems } from './csp_page_template';
import { LOADING, PACKAGE_NOT_INSTALLED_TEXT, DEFAULT_NO_DATA_TEXT } from './translations';
import { useCisKubernetesIntegration } from '../common/api/use_cis_kubernetes_integration';
import { UseQueryResult } from 'react-query';

const chance = new Chance();

// Synchronized to the error message in the formatted message in `page_template.tsx`
const ERROR_LOADING_DATA_DEFAULT_MESSAGE = "We couldn't fetch your cloud security posture data";
const packageNotInstalledUniqueTexts = [
  PACKAGE_NOT_INSTALLED_TEXT.PAGE_TITLE,
  PACKAGE_NOT_INSTALLED_TEXT.DESCRIPTION,
];

jest.mock('../common/api/use_cis_kubernetes_integration');

describe('getSideNavItems', () => {
  it('maps navigation items to side navigation items', () => {
    const navigationItem = createNavigationItemFixture();
    const id = chance.word();
    const sideNavItems = getSideNavItems({ [id]: navigationItem });

    expect(sideNavItems).toHaveLength(1);
    expect(sideNavItems[0]).toMatchObject({
      id,
      name: navigationItem.name,
      renderItem: expect.any(Function),
    });
  });

  it('does not map disabled navigation items to side navigation items', () => {
    const navigationItem = createNavigationItemFixture({ disabled: true });
    const id = chance.word();
    const sideNavItems = getSideNavItems({ [id]: navigationItem });
    expect(sideNavItems).toHaveLength(0);
  });
});

describe('<CspPageTemplate />', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // if package installation status is 'not_installed', CspPageTemplate will render a noDataConfig prompt
    (useCisKubernetesIntegration as jest.Mock).mockImplementation(() => ({ status: 'installed' }));
  });

  const renderCspPageTemplate = (props: ComponentProps<typeof CspPageTemplate> = {}) => {
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
        <CspPageTemplate {...props} />
      </TestProvider>
    );
  };

  it('renders children if integraion is installed', () => {
    const children = chance.sentence();
    renderCspPageTemplate({ children });

    expect(screen.getByText(children)).toBeInTheDocument();
    expect(screen.queryByText(LOADING)).not.toBeInTheDocument();
    expect(screen.queryByText(ERROR_LOADING_DATA_DEFAULT_MESSAGE)).not.toBeInTheDocument();
    packageNotInstalledUniqueTexts.forEach((text: string) =>
      expect(screen.queryByText(text)).not.toBeInTheDocument()
    );
  });

  it('renders integrations installation promprt if integraion is not installed', () => {
    (useCisKubernetesIntegration as jest.Mock).mockImplementation(() => ({
      status: 'not_installed',
    }));

    const children = chance.sentence();
    renderCspPageTemplate({ children });

    Object.values(PACKAGE_NOT_INSTALLED_TEXT).forEach((text: string) =>
      expect(screen.queryByText(text)).toBeInTheDocument()
    );
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByText(LOADING)).not.toBeInTheDocument();
    expect(screen.queryByText(ERROR_LOADING_DATA_DEFAULT_MESSAGE)).not.toBeInTheDocument();
  });

  it('renders loading text when query is loading', () => {
    const query = createReactQueryResponse({
      status: 'loading',
    }) as unknown as UseQueryResult;

    const children = chance.sentence();
    renderCspPageTemplate({ children, query });

    expect(screen.queryByText(LOADING)).toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByText(ERROR_LOADING_DATA_DEFAULT_MESSAGE)).not.toBeInTheDocument();
    packageNotInstalledUniqueTexts.forEach((text: string) =>
      expect(screen.queryByText(text)).not.toBeInTheDocument()
    );
  });

  it('renders error text when query is error', () => {
    const query = createReactQueryResponse({
      status: 'error',
      error: {
        body: {
          error: chance.sentence(),
          message: chance.sentence(),
          statusCode: chance.integer(),
        },
      },
    }) as unknown as UseQueryResult;

    const children = chance.sentence();
    renderCspPageTemplate({ children, query });

    expect(screen.queryByText(ERROR_LOADING_DATA_DEFAULT_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(LOADING)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    packageNotInstalledUniqueTexts.forEach((text: string) =>
      expect(screen.queryByText(text)).not.toBeInTheDocument()
    );
  });

  it('prefers custom error render', () => {
    const message = chance.sentence();

    const query = createReactQueryResponse({
      status: 'error',
      error: {
        body: {
          error: chance.sentence(),
          message,
          statusCode: chance.integer(),
        },
      },
    }) as unknown as UseQueryResult;

    const children = chance.sentence();
    renderCspPageTemplate({
      children,
      query,
      errorRender: (error) => <div>{error.body.message}</div>,
    });

    expect(screen.queryByText(message)).toBeInTheDocument();
    expect(screen.queryByText(ERROR_LOADING_DATA_DEFAULT_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByText(LOADING)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    packageNotInstalledUniqueTexts.forEach((text: string) =>
      expect(screen.queryByText(text)).not.toBeInTheDocument()
    );
  });

  it('prefers custom loading render', () => {
    const loading = chance.sentence();

    const query = createReactQueryResponse({
      status: 'loading',
    }) as unknown as UseQueryResult;

    const children = chance.sentence();
    renderCspPageTemplate({
      children,
      query,
      loadingRender: () => <div>{loading}</div>,
    });

    expect(screen.queryByText(loading)).toBeInTheDocument();
    expect(screen.queryByText(ERROR_LOADING_DATA_DEFAULT_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByText(LOADING)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    packageNotInstalledUniqueTexts.forEach((text: string) =>
      expect(screen.queryByText(text)).not.toBeInTheDocument()
    );
  });

  it('renders noDataConfig prompt when query data is undefined', () => {
    const query = createReactQueryResponse({
      status: 'success',
      data: undefined,
    }) as unknown as UseQueryResult;

    const children = chance.sentence();
    renderCspPageTemplate({ children, query });

    expect(screen.queryByText(DEFAULT_NO_DATA_TEXT.PAGE_TITLE)).toBeInTheDocument();
    expect(screen.queryByText(LOADING)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByText(ERROR_LOADING_DATA_DEFAULT_MESSAGE)).not.toBeInTheDocument();
    packageNotInstalledUniqueTexts.forEach((text: string) =>
      expect(screen.queryByText(text)).not.toBeInTheDocument()
    );
  });

  it('prefers custom noDataConfig prompt', () => {
    const pageTitle = chance.sentence();
    const solution = chance.sentence();
    const docsLink = chance.sentence();

    const query = createReactQueryResponse({
      status: 'success',
      data: undefined,
    }) as unknown as UseQueryResult;

    const children = chance.sentence();
    renderCspPageTemplate({
      children,
      query,
      noDataConfig: { pageTitle, solution, docsLink, actions: {} },
    });

    expect(screen.queryByText(pageTitle)).toBeInTheDocument();
    expect(screen.getByText(solution, { exact: false })).toBeInTheDocument();
    expect(screen.queryByText(LOADING)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByText(ERROR_LOADING_DATA_DEFAULT_MESSAGE)).not.toBeInTheDocument();
    packageNotInstalledUniqueTexts.forEach((text: string) =>
      expect(screen.queryByText(text)).not.toBeInTheDocument()
    );
  });
});
