/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TraceOverview } from '.';
import { useApmIndexSettingsContext } from '../../../context/apm_index_settings/use_apm_index_settings_context';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';

// `TraceOverview` renders `OpenInDiscover`, which transitively depends on the
// APM index settings context and the Discover locator from `useApmPluginContext`
// to compute its href. Both contexts are mocked here so we can exercise the
// composed tree without spinning up the full APM providers.
jest.mock('../../../context/apm_index_settings/use_apm_index_settings_context');
jest.mock('../../../context/apm_plugin/use_apm_plugin_context');
jest.mock('../../../hooks/use_apm_params');

// The provider internally calls `useKibana` + `useFetcher` to load index
// settings; we mock it as a pass-through and rely on the
// `useApmIndexSettingsContext` mock above to drive the consumed values.
jest.mock('../../../context/apm_index_settings/apm_index_settings_context', () => ({
  ApmIndexSettingsContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../routing/templates/apm_main_template', () => ({
  ApmMainTemplate: ({
    pageTitle,
    children,
  }: {
    pageTitle?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-test-subj="apmMainTemplateMock">
      <div data-test-subj="apmMainTemplatePageTitle">{pageTitle}</div>
      {children}
    </div>
  ),
}));

jest.mock('../breadcrumb', () => ({
  Breadcrumb: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const TRACES_INDEX = 'traces-apm-*';

const mockUseApmIndexSettingsContext = useApmIndexSettingsContext as jest.MockedFunction<
  typeof useApmIndexSettingsContext
>;
const mockUseApmPluginContext = useApmPluginContext as jest.MockedFunction<
  typeof useApmPluginContext
>;
const mockUseApmParams = useApmParams as jest.MockedFunction<typeof useApmParams>;

const mockGetRedirectUrl = jest.fn<string | undefined, [unknown]>();
const mockLocatorGet = jest.fn().mockReturnValue({ getRedirectUrl: mockGetRedirectUrl });

describe('TraceOverview', () => {
  beforeEach(() => {
    mockUseApmIndexSettingsContext.mockReturnValue({
      indexSettings: [
        { configurationName: 'transaction', defaultValue: TRACES_INDEX, savedValue: undefined },
        { configurationName: 'span', defaultValue: TRACES_INDEX, savedValue: undefined },
      ],
      indexSettingsStatus: FETCH_STATUS.SUCCESS,
    });

    mockUseApmPluginContext.mockReturnValue({
      share: { url: { locators: { get: mockLocatorGet } } },
    } as unknown as ReturnType<typeof useApmPluginContext>);

    mockUseApmParams.mockReturnValue({
      query: {
        environment: 'ENVIRONMENT_ALL',
        kuery: '',
        rangeFrom: 'now-15m',
        rangeTo: 'now',
      },
    } as unknown as ReturnType<typeof useApmParams>);

    mockGetRedirectUrl.mockReturnValue('http://test-discover-url');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Explore traces page-header button with a Discover href', () => {
    render(
      <TraceOverview>
        <div />
      </TraceOverview>
    );

    const button = screen.getByTestId('apmTracesExploreInDiscoverButton');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('href', 'http://test-discover-url');
    expect(button).toHaveTextContent('Explore traces');
  });

  it('passes the current time range and a traces-scoped ES|QL query to Discover', () => {
    render(
      <TraceOverview>
        <div />
      </TraceOverview>
    );

    expect(mockGetRedirectUrl).toHaveBeenCalled();
    const [args] = mockGetRedirectUrl.mock.calls.at(-1) as [
      { timeRange: { from: string; to: string }; query: { esql: string } }
    ];
    expect(args.timeRange).toEqual({ from: 'now-15m', to: 'now' });
    expect(args.query.esql).toContain(`FROM ${TRACES_INDEX}`);
    expect(args.query.esql).toContain('SORT @timestamp DESC');
    // Empty `kuery` and ENVIRONMENT_ALL must not produce filter clauses for them.
    expect(args.query.esql).not.toContain('KQL');
    expect(args.query.esql).not.toContain('service.environment');
  });
});
