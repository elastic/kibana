/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { ISection } from '../../../typings/section';
import { render } from '../../../utils/test_helper';
import { EmptySection } from './';

describe('EmptySection', () => {
  it('renders without action button', () => {
    const section: ISection = {
      id: 'apm',
      title: 'APM',
      icon: 'logoAPM',
      description: 'foo bar',
    };
    const { getByText, queryAllByText } = render(<EmptySection section={section} />);

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
    const { getByText, getByTestId } = render(<EmptySection section={section} />);

    expect(getByText('APM')).toBeInTheDocument();
    expect(getByText('foo bar')).toBeInTheDocument();
    const linkButton = getByTestId('empty-apm') as HTMLAnchorElement;
    expect(linkButton.href).toEqual('https://www.elastic.co/');
  });
});
