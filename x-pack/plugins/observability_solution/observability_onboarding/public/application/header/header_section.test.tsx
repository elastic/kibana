/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { Wrapper } from '../shared/test_wrapper';
import { HeaderSection } from './header_section';

describe('HeaderSection', () => {
  it('renders normally when route is not a header override', () => {
    const { getByText } = render(<HeaderSection pathname="/systemLogs" />, {
      wrapper: Wrapper({
        location: '/',
      }),
    });

    expect(getByText('Add Observability data'));
    expect(
      getByText(
        'Start ingesting Observability data into Elastic. Return to this page at any time by clicking Add data.'
      )
    );
  });

  it('renders the k8s header for /kubernetes', () => {
    const { getByText } = render(<HeaderSection pathname="/kubernetes" />, {
      wrapper: Wrapper({
        location: '/',
      }),
    });

    expect(getByText('Setting up Kubernetes with Elastic Agent'));
  });

  it('renders the k8s header for kubernetes path with search', () => {
    const { getByText } = render(<HeaderSection pathname="/kubernetes?category=infra" />, {
      wrapper: Wrapper({
        location: '/',
      }),
    });

    expect(getByText('Setting up Kubernetes with Elastic Agent'));
  });
});
