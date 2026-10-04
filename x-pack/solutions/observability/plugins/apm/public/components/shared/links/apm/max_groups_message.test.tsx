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
      <MaxGroupsMessage serviceOverflowCount={serviceOverflowCount} />
    </MockApmPluginContextWrapper>
  );
}

describe('MaxGroupsMessage', () => {
  it('resolves the troubleshooting docs link through the doc links service', () => {
    renderMessage();

    expect(screen.getByTestId('apmMaxGroupsMessageDocsLink')).toHaveAttribute(
      'href',
      mockApmPluginContextValue.core.docLinks.links.apm.troubleshootingTooManyTransactions
    );
  });

  it('shows a singular hidden-service count when exactly one service overflows', () => {
    renderMessage(1);

    expect(screen.getByText(/1 additional service is not shown/i)).toBeInTheDocument();
  });

  it('shows the hidden-service count when multiple services overflow', () => {
    renderMessage(47);

    expect(screen.getByText(/47 additional services are not shown/i)).toBeInTheDocument();
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
    }
  );
});
