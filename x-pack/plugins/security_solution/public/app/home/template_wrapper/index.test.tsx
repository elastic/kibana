/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { SecuritySolutionTemplateWrapper, type SecuritySolutionTemplateWrapperProps } from '.';
import { SecurityPageName } from '../../types';

const mockUseShowTimeline = jest.fn((): [boolean] => [false]);
jest.mock('../../../common/utils/timeline/use_show_timeline', () => ({
  ...jest.requireActual('../../../common/utils/timeline/use_show_timeline'),
  useShowTimeline: () => mockUseShowTimeline(),
}));

jest.mock('./timeline', () => ({
  ...jest.requireActual('./timeline'),
  Timeline: () => <div>{'Timeline'}</div>,
}));

jest.mock('../../../common/components/navigation/use_security_solution_navigation', () => {
  return {
    useSecuritySolutionNavigation: () => ({
      icon: 'logoSecurity',
      items: [
        {
          id: 'investigate',
          name: 'Investigate',
          items: [
            {
              'data-href': 'some-data-href',
              'data-test-subj': 'navigation-cases',
              disabled: false,
              href: 'some-href',
              id: 'cases',
              isSelected: true,
              name: 'Cases',
            },
          ],
          tabIndex: undefined,
        },
      ],
      name: 'Security',
    }),
  };
});

const mockUseRouteSpy = jest.fn((): [{ pageName: string }] => [
  { pageName: SecurityPageName.alerts },
]);
jest.mock('../../../common/utils/route/use_route_spy', () => ({
  useRouteSpy: () => mockUseRouteSpy(),
}));

const renderComponent = ({
  children = <div>{'child of wrapper'}</div>,
  ...props
}: SecuritySolutionTemplateWrapperProps = {}) =>
  render(
    <TestProviders>
      <SecuritySolutionTemplateWrapper {...props}>{children}</SecuritySolutionTemplateWrapper>
    </TestProviders>
  );

describe('SecuritySolutionTemplateWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should render with bottom bar when user allowed', async () => {
    mockUseShowTimeline.mockReturnValue([true]);
    const { getByText } = renderComponent();

    await waitFor(() => {
      expect(getByText('child of wrapper')).toBeInTheDocument();
      expect(getByText('Timeline')).toBeInTheDocument();
    });
  });

  it('Should not show bottom bar when user not allowed', async () => {
    mockUseShowTimeline.mockReturnValue([false]);

    const { getByText, queryByText } = renderComponent();

    await waitFor(() => {
      expect(getByText('child of wrapper')).toBeInTheDocument();
      expect(queryByText('Timeline')).not.toBeInTheDocument();
    });
  });

  it('Should render emptyPageBody when isEmptyState is true', async () => {
    mockUseShowTimeline.mockReturnValue([false]);

    const { getByText } = renderComponent({
      isEmptyState: true,
      emptyPageBody: <div>{'empty page body'}</div>,
      children: null,
    });

    expect(getByText('empty page body')).toBeInTheDocument();
  });
});
