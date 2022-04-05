/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, forNearestButton, forNearestAnchor } from '../../lib/helper/rtl_helpers';

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

  it('renders loading state when allowed state is loading', async () => {
    jest
      .spyOn(allowedHook, 'useSyntheticsServiceAllowed')
      .mockReturnValue({ loading: true, signupUrl: null });

    const { findByText } = render(
      <ServiceAllowedWrapper>
        <div>Test text</div>
      </ServiceAllowedWrapper>
    );

    expect(await findByText('Loading Monitor Management')).toBeInTheDocument();
  });

  it('renders children when allowed state is true', async () => {
    jest
      .spyOn(allowedHook, 'useSyntheticsServiceAllowed')
      .mockReturnValue({ loading: false, isAllowed: true, signupUrl: 'https://example.com' });

    const { findByText, queryByText } = render(
      <ServiceAllowedWrapper>
        <div>Test text</div>
      </ServiceAllowedWrapper>
    );

    expect(await findByText('Test text')).toBeInTheDocument();
    expect(await queryByText('Monitor management')).not.toBeInTheDocument();
  });

  describe('when enabled state is false', () => {
    it('renders an enabled button if there is a form URL', async () => {
      jest
        .spyOn(allowedHook, 'useSyntheticsServiceAllowed')
        .mockReturnValue({ loading: false, isAllowed: false, signupUrl: 'https://example.com' });

      const { findByText, getByText } = render(
        <ServiceAllowedWrapper>
          <div>Test text</div>
        </ServiceAllowedWrapper>
      );

      expect(await findByText('Monitor Management')).toBeInTheDocument();
      expect(forNearestAnchor(getByText)('Request access')).toBeEnabled();
      expect(forNearestAnchor(getByText)('Request access')).toHaveAttribute(
        'href',
        'https://example.com'
      );
    });

    it('renders a disabled button if there is no form URL', async () => {
      jest
        .spyOn(allowedHook, 'useSyntheticsServiceAllowed')
        .mockReturnValue({ loading: false, isAllowed: false, signupUrl: null });

      const { findByText, getByText } = render(
        <ServiceAllowedWrapper>
          <div>Test text</div>
        </ServiceAllowedWrapper>
      );

      expect(await findByText('Monitor Management')).toBeInTheDocument();
      expect(forNearestButton(getByText)('Request access')).toBeDisabled();
    });

    it('renders when enabled state is false', async () => {
      jest
        .spyOn(allowedHook, 'useSyntheticsServiceAllowed')
        .mockReturnValue({ loading: false, isAllowed: false, signupUrl: 'https://example.com' });

      const { findByText } = render(
        <ServiceAllowedWrapper>
          <div>Test text</div>
        </ServiceAllowedWrapper>
      );

      expect(await findByText('Monitor Management')).toBeInTheDocument();
    });
  });
});
