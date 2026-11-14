/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  MockApmPluginContextWrapper,
  mockApmPluginContextValue,
} from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { MaxGroupsMessage } from './max_groups_message';

function renderMessage(serviceOverflowCount?: number) {
  return render(
    <MockApmPluginContextWrapper>
      <MaxGroupsMessage type="services" serviceOverflowCount={serviceOverflowCount} />
    </MockApmPluginContextWrapper>
  );
}

describe('MaxGroupsMessage', () => {
  it('resolves the transactions troubleshooting docs link through the doc links service', () => {
    render(
      <MockApmPluginContextWrapper>
        <MaxGroupsMessage type="transactions" />
      </MockApmPluginContextWrapper>
    );

    expect(screen.getByTestId('apmMaxGroupsMessageDocsLink')).toHaveAttribute(
      'href',
      mockApmPluginContextValue.core.docLinks.links.apm.troubleshootingTooManyTransactions
    );
  });

  it('resolves the services troubleshooting docs link through the doc links service', () => {
    render(
      <MockApmPluginContextWrapper>
        <MaxGroupsMessage type="services" />
      </MockApmPluginContextWrapper>
    );

    expect(screen.getByTestId('apmMaxGroupsMessageDocsLink')).toHaveAttribute(
      'href',
      mockApmPluginContextValue.core.docLinks.links.apm.troubleshootingTooManyServices
    );
  });

  it('shows a singular hidden-service count when exactly one service overflows', () => {
    renderMessage(1);

    expect(screen.getByText(/1 additional service is not shown/i)).toBeInTheDocument();
  });

  it('shows the hidden-service count and services docs link when multiple services overflow', () => {
    renderMessage(47);

    expect(screen.getByText(/47 additional services are not shown/i)).toBeInTheDocument();
    expect(screen.getByTestId('apmMaxGroupsMessageDocsLink')).toHaveAttribute(
      'href',
      mockApmPluginContextValue.core.docLinks.links.apm.troubleshootingTooManyServices
    );
  });

  it('formats a large hidden-service count for the current locale', () => {
    renderMessage(1234);

    expect(screen.getByText(/1,234 additional services are not shown/i)).toBeInTheDocument();
  });

  it.each([0, undefined])(
    'keeps the generic fallback when the overflow count is %s',
    (serviceOverflowCount) => {
      renderMessage(serviceOverflowCount);

      expect(
        screen.getByText(/The cardinality of APM data being collected is too high/i)
      ).toBeInTheDocument();
      expect(screen.queryByText(/additional service/i)).not.toBeInTheDocument();
      expect(screen.getByTestId('apmMaxGroupsMessageDocsLink')).toHaveAttribute(
        'href',
        mockApmPluginContextValue.core.docLinks.links.apm.troubleshootingTooManyServices
      );
    }
  );

  it('keeps the transactions fallback and docs link when a service overflow count is provided', () => {
    render(
      <MockApmPluginContextWrapper>
        <MaxGroupsMessage type="transactions" serviceOverflowCount={47} />
      </MockApmPluginContextWrapper>
    );

    expect(
      screen.getByText(/The cardinality of APM data being collected is too high/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/additional service/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('apmMaxGroupsMessageDocsLink')).toHaveAttribute(
      'href',
      mockApmPluginContextValue.core.docLinks.links.apm.troubleshootingTooManyTransactions
    );
  });
});
