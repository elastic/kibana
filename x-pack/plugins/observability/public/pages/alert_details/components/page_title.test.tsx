/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { PageTitle, PageTitleProps } from './page_title';

describe('Page Title', () => {
  const defaultProps = {
    title: 'Great success',
    active: true,
  };

  const renderComp = (props: PageTitleProps) => {
    return render(<PageTitle {...props} />);
  };

  it('should display a title when it is passed', () => {
    const { getByText } = renderComp(defaultProps);
    expect(getByText(defaultProps.title)).toBeTruthy();
  });

  it('should display an active badge when active is true', async () => {
    const { getByText } = renderComp(defaultProps);
    expect(getByText('Active')).toBeTruthy();
  });

  it('should display an inactive badge when active is false', async () => {
    const { getByText } = renderComp({ ...defaultProps, active: false });

    expect(getByText('Recovered')).toBeTruthy();
  });

  it('should display no badge when active is not passed', async () => {
    const { queryByTestId } = renderComp({ title: '123' });

    expect(queryByTestId('page-title-active-badge')).not.toBeInTheDocument();
  });
});
