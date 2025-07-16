/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { HomeLink } from './home_link';
import * as useApmRouterModule from '../../../../hooks/use_apm_router';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiLink: ({ children, ...props }: any) => <a {...props}>{children || 'Link'}</a>,
}));

describe('HomeLink', () => {
  const mockLink = jest.fn();

  beforeEach(() => {
    mockLink.mockClear();
    jest.spyOn(useApmRouterModule, 'useApmRouter').mockReturnValue({
      link: mockLink,
    } as any);
  });

  it('renders EuiLink with correct href and data-test-subj', () => {
    const expectedHref =
      '/services?kuery=&serviceGroup=&comparisonEnabled=true&rangeFrom=now-15m&rangeTo=now&environment=ENVIRONMENT_ALL';
    mockLink.mockReturnValue(expectedHref);

    render(<HomeLink />);

    const link = screen.getByTestId('apmHomeLink');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expectedHref);
  });

  it('calls link with correct arguments', () => {
    render(<HomeLink />);
    expect(mockLink).toHaveBeenCalledWith('/services', {
      query: {
        kuery: '',
        serviceGroup: '',
        comparisonEnabled: true,
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        environment: ENVIRONMENT_ALL.value,
      },
    });
  });
});
