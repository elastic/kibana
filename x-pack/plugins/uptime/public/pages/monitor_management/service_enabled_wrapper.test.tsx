/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../lib/helper/rtl_helpers';
import { ServiceEnabledWrapper } from './service_enabled_wrapper';

import * as enabledHook from '../../components/monitor_management/hooks/use_service_enabled';

describe('ServiceEnabledWrapper', () => {
  it('renders expected elements for valid props', async () => {
    const { findByText } = render(
      <ServiceEnabledWrapper>
        <div>Test text</div>
      </ServiceEnabledWrapper>
    );

    expect(await findByText('Test text')).toBeInTheDocument();
  });

  it('renders when enabled state is loading', async () => {
    jest.spyOn(enabledHook, 'useServiceEnabled').mockReturnValue({ loading: true });

    const { findByText } = render(
      <ServiceEnabledWrapper>
        <div>Test text</div>
      </ServiceEnabledWrapper>
    );

    expect(await findByText('Loading monitor management')).toBeInTheDocument();
  });

  it('renders when enabled state is false', async () => {
    jest
      .spyOn(enabledHook, 'useServiceEnabled')
      .mockReturnValue({ loading: false, isEnabled: false });

    const { findByText } = render(
      <ServiceEnabledWrapper>
        <div>Test text</div>
      </ServiceEnabledWrapper>
    );

    expect(await findByText('Monitor management')).toBeInTheDocument();
  });

  it('renders when enabled state is true', async () => {
    jest
      .spyOn(enabledHook, 'useServiceEnabled')
      .mockReturnValue({ loading: false, isEnabled: true });

    const { findByText } = render(
      <ServiceEnabledWrapper>
        <div>Test text</div>
      </ServiceEnabledWrapper>
    );

    expect(await findByText('Test text')).toBeInTheDocument();
  });
});
