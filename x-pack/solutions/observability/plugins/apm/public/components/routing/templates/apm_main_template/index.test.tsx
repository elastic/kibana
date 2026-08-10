/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { ApmMainTemplate } from '.';

const mockPageTemplate = jest.fn(
  ({ children, pageHeader }: { children: React.ReactNode; pageHeader?: unknown }) => (
    <div data-test-subj="mockObservabilityPageTemplate">
      {pageHeader ? <div data-test-subj="legacyPageHeader" /> : null}
      {children}
    </div>
  )
);

jest.mock('../../../../hooks/use_fetcher', () => ({
  FETCH_STATUS: {
    LOADING: 'loading',
    SUCCESS: 'success',
    FAILURE: 'failure',
    NOT_INITIATED: 'not_initiated',
  },
  useFetcher: () => ({ data: { hasData: true }, status: 'success' }),
}));

jest.mock('../../../../hooks/use_default_ai_assistant_starter_prompts_for_apm', () => ({
  useDefaultAiAssistantStarterPromptsForAPM: () => {},
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      docLinks: { links: { observability: { guide: 'https://example.com' } } },
      observabilityShared: {
        navigation: { PageTemplate: mockPageTemplate },
      },
      application: { capabilities: { savedObjectsManagement: { edit: false } } },
      share: { url: { locators: { get: () => undefined } } },
    },
  }),
}));

function renderTemplate(ui: React.ReactElement) {
  const history = createMemoryHistory({ initialEntries: ['/services'] });
  return render(
    <MockAppHeaderProvider>
      <Router history={history}>{ui}</Router>
    </MockAppHeaderProvider>
  );
}

describe('ApmMainTemplate', () => {
  beforeEach(() => {
    mockPageTemplate.mockClear();
  });

  it('renders AppHeader without a legacy pageHeader when header prop is set', () => {
    renderTemplate(
      <ApmMainTemplate header={{ title: 'Service inventory' }} searchBar={<div>search</div>}>
        <div>body</div>
      </ApmMainTemplate>
    );

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Service inventory'
    );
    expect(screen.getByText('search')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(screen.queryByTestId('legacyPageHeader')).not.toBeInTheDocument();

    expect(mockPageTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        pageSectionProps: expect.objectContaining({ paddingSize: 'none' }),
      }),
      expect.anything()
    );
  });

  it('keeps the legacy pageHeader path when header prop is omitted', () => {
    renderTemplate(
      <ApmMainTemplate pageTitle="Legacy title">
        <div>body</div>
      </ApmMainTemplate>
    );

    expect(screen.getByTestId('legacyPageHeader')).toBeInTheDocument();
    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.title)).not.toBeInTheDocument();
  });
});
