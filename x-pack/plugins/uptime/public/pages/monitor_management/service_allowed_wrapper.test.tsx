/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../lib/helper/rtl_helpers';

import * as allowedHook from '../../components/monitor_management/hooks/use_service_allowed';
import { ServiceAllowedWrapper } from './service_allowed_wrapper';

describe('ServiceAllowedWrapper', () => {
  it('renders expected elements for valid props', async () => {
    const { findByText } = render(
      <ServiceAllowedWrapper>
        <div>Test text</div>
      </ServiceAllowedWrapper>
    );

    expect(await findByText('Test text')).toBeInTheDocument();
  });

  it('renders when enabled state is loading', async () => {
    jest.spyOn(allowedHook, 'useSyntheticsServiceAllowed').mockReturnValue({ loading: true });

    const { findByText } = render(
      <ServiceAllowedWrapper>
        <div>Test text</div>
      </ServiceAllowedWrapper>
    );

    expect(await findByText('Loading Monitor Management')).toBeInTheDocument();
  });

  it('renders when enabled state is false', async () => {
    jest
      .spyOn(allowedHook, 'useSyntheticsServiceAllowed')
      .mockReturnValue({ loading: false, isAllowed: false });

    const { findByText } = render(
      <ServiceAllowedWrapper>
        <div>Test text</div>
      </ServiceAllowedWrapper>
    );

    expect(await findByText('Monitor Management')).toBeInTheDocument();
  });

  it('renders when enabled state is true', async () => {
    jest
      .spyOn(allowedHook, 'useSyntheticsServiceAllowed')
      .mockReturnValue({ loading: false, isAllowed: true });

    const { findByText } = render(
      <ServiceAllowedWrapper>
        <div>Test text</div>
      </ServiceAllowedWrapper>
    );

    expect(await findByText('Test text')).toBeInTheDocument();
  });
});
