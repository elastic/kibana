/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { PageTitle } from './page_title';
import { Alert } from '../types';

describe('page title', () => {
  const defaultName = 'Avg latency is 84% above the threshold';
  const defaultTags = ['tag-1', 'tag-2', 'tag-3'];
  const defaultAlert: Alert = {
    alertId: 'alertId',
    ruleId: 'ruleId',
    name: defaultName,
    updatedAt: '2022-09-06',
    updatedBy: 'Elastic',
    createdAt: '2022-09-06',
    createdBy: 'Elastic',
    tags: defaultTags,
  };

  const renderComp = (alert: Alert) => {
    return render(<PageTitle alert={alert} />);
  };

  it('should display the page title', () => {
    const { queryByText, rerender } = renderComp(defaultAlert);
    expect(queryByText(defaultName)).toBeTruthy();

    rerender(<PageTitle alert={{ ...defaultAlert, name: 'baz' }} />);

    expect(queryByText(defaultName)).not.toBeTruthy();
  });

  it('should display tags as badges when passed', () => {
    const { queryAllByText, rerender } = renderComp(defaultAlert);

    expect(queryAllByText(/tag-./)).toHaveLength(defaultTags.length);

    rerender(<PageTitle alert={{ ...defaultAlert, tags: undefined }} />);

    expect(queryAllByText(/tag-./)).toHaveLength(0);
  });

  it('should display created by and last updated by when passed', () => {
    const { queryByTestId } = renderComp(defaultAlert);
    expect(queryByTestId('lastUpdatedCreatedBy')).toBeTruthy();
  });
});
