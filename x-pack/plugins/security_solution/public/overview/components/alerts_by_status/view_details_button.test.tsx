/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { TestProviders } from '../../../common/mock/test_providers';
import { ViewDetailsButton } from './view_details_button';

jest.mock('../../../common/lib/kibana/kibana_react');

describe('ViewDetailsButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        theme: {},
      },
    });
  });

  test('render button with onClick', () => {
    const onClick = jest.fn();
    const { container } = render(
      <TestProviders>
        <ViewDetailsButton name="mockName" onClick={onClick} />
      </TestProviders>
    );

    expect(container.querySelector(`[data-test-subj="view-details-button"]`)).toBeInTheDocument();
  });

  test('render button with href', () => {
    const href = '#';
    const { container } = render(
      <TestProviders>
        <ViewDetailsButton name="mockName" href={href} />
      </TestProviders>
    );

    expect(container.querySelector(`[data-test-subj="view-details-button"]`)).toBeInTheDocument();
  });

  test('does Not render button without href or onClick', () => {
    const { container } = render(
      <TestProviders>
        <ViewDetailsButton name="mockName" />
      </TestProviders>
    );

    expect(
      container.querySelector(`[data-test-subj="view-details-button"]`)
    ).not.toBeInTheDocument();
  });
});
