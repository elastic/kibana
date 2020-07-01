/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { render } from '@testing-library/react';
import React from 'react';
import { EuiThemeProvider } from '../../../typings';
import { EmptySection } from './';
import { ISection } from '../../../typings/section';

describe('EmptySection', () => {
  it('renders without action button', () => {
    const section: ISection = {
      id: 'apm',
      title: 'APM',
      icon: 'logoAPM',
      description: 'foo bar',
    };
    const { getByText, queryAllByText } = render(
      <EuiThemeProvider>
        <EmptySection section={section} />
      </EuiThemeProvider>
    );

    expect(getByText('APM')).toBeInTheDocument();
    expect(getByText('foo bar')).toBeInTheDocument();
    expect(queryAllByText('Install agent')).toEqual([]);
  });
  it('renders with action button', () => {
    const section: ISection = {
      id: 'apm',
      title: 'APM',
      icon: 'logoAPM',
      description: 'foo bar',
      linkTitle: 'install agent',
      href: 'https://www.elastic.co',
    };
    const { getByText, getByTestId } = render(
      <EuiThemeProvider>
        <EmptySection section={section} />
      </EuiThemeProvider>
    );

    expect(getByText('APM')).toBeInTheDocument();
    expect(getByText('foo bar')).toBeInTheDocument();
    const linkButton = getByTestId('empty-apm') as HTMLAnchorElement;
    expect(linkButton.href).toEqual('https://www.elastic.co/');
  });
});
