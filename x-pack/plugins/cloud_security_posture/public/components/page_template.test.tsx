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
import { createStubDataView } from '../../../../../src/plugins/data_views/public/data_views/data_view.stub';
import { CSP_KUBEBEAT_INDEX_PATTERN } from '../../common/constants';
import { useKubebeatDataView } from '../common/api/use_kubebeat_data_view';
import { createNavigationItemFixture } from '../test/fixtures/navigation_item';
import { createReactQueryResponse } from '../test/fixtures/react_query';
import { TestProvider } from '../test/test_provider';
import { CspPageTemplate, getSideNavItems } from './page_template';
import {
  LOADING,
  NO_DATA_CONFIG_BUTTON,
  NO_DATA_CONFIG_DESCRIPTION,
  NO_DATA_CONFIG_TITLE,
} from './translations';

const chance = new Chance();

const BLANK_PAGE_GRAPHIC_TEXTS = [
  NO_DATA_CONFIG_TITLE,
  NO_DATA_CONFIG_DESCRIPTION,
  NO_DATA_CONFIG_BUTTON,
];

// Synchronized to the error message in the formatted message in `page_template.tsx`
const ERROR_LOADING_DATA_DEFAULT_MESSAGE = "We couldn't fetch your cloud security posture data";

jest.mock('../common/api/use_kubebeat_data_view');

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

  it('renders children when data view is found', () => {
    (useKubebeatDataView as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: createStubDataView({
          spec: {
            id: CSP_KUBEBEAT_INDEX_PATTERN,
          },
        }),
      })
    );

    const children = chance.sentence();
    renderCspPageTemplate({ children });

    expect(screen.getByText(children)).toBeInTheDocument();
    expect(screen.queryByText(LOADING)).not.toBeInTheDocument();
    expect(screen.queryByText(ERROR_LOADING_DATA_DEFAULT_MESSAGE)).not.toBeInTheDocument();
    BLANK_PAGE_GRAPHIC_TEXTS.forEach((blankPageGraphicText) =>
      expect(screen.queryByText(blankPageGraphicText)).not.toBeInTheDocument()
    );
  });

  it('renders loading text when data view is loading', () => {
    (useKubebeatDataView as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({ status: 'loading' })
    );

    const children = chance.sentence();
    renderCspPageTemplate({ children });

    expect(screen.getByText(LOADING)).toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    expect(screen.queryByText(ERROR_LOADING_DATA_DEFAULT_MESSAGE)).not.toBeInTheDocument();
    BLANK_PAGE_GRAPHIC_TEXTS.forEach((blankPageGraphicText) =>
      expect(screen.queryByText(blankPageGraphicText)).not.toBeInTheDocument()
    );
  });

  it('renders an error view when data view fetching has an error', () => {
    (useKubebeatDataView as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({ status: 'error', error: new Error('') })
    );

    const children = chance.sentence();
    renderCspPageTemplate({ children });

    expect(screen.getByText(ERROR_LOADING_DATA_DEFAULT_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(LOADING)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
    BLANK_PAGE_GRAPHIC_TEXTS.forEach((blankPageGraphicText) =>
      expect(screen.queryByText(blankPageGraphicText)).not.toBeInTheDocument()
    );
  });

  it('renders the blank page graphic when data view is missing', () => {
    (useKubebeatDataView as jest.Mock).mockImplementation(() =>
      createReactQueryResponse({
        status: 'success',
        data: undefined,
      })
    );

    const children = chance.sentence();
    renderCspPageTemplate({ children });

    BLANK_PAGE_GRAPHIC_TEXTS.forEach((text) => expect(screen.getByText(text)).toBeInTheDocument());
    expect(screen.queryByText(ERROR_LOADING_DATA_DEFAULT_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByText(LOADING)).not.toBeInTheDocument();
    expect(screen.queryByText(children)).not.toBeInTheDocument();
  });
});
