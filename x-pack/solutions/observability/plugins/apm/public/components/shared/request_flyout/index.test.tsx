/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CoreStart } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import { RequestFlyout } from '.';

jest.mock('../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({ start: '2024-01-01T00:00:00.000Z', end: '2024-01-01T01:00:00.000Z' }),
}));
jest.mock('../../../context/time_range_metadata/time_range_metadata_context', () => ({
  TimeRangeMetadataContextProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../responsive_flyout', () => ({
  ResponsiveFlyout: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="requestFlyout">{children}</div>
  ),
}));
jest.mock('./request_flyout_content', () => ({
  RequestFlyoutContent: () => <div data-test-subj="requestFlyoutContent" />,
}));

const deps = { core: { uiSettings: {} } as unknown as CoreStart };
const baseProps = {
  deps,
  environment: 'production' as const,
  rangeFrom: 'now-1h',
  rangeTo: 'now',
  onClose: jest.fn(),
};

describe('RequestFlyout', () => {
  it('shows the title of the connection and its content', () => {
    render(
      <RequestFlyout
        {...baseProps}
        connection={{
          sourceServiceName: 'frontend',
          sourceLabel: 'frontend',
          targetLabel: 'postgresql',
          dependencies: ['postgresql'],
        }}
      />
    );

    expect(screen.getByText('frontend → postgresql')).toBeInTheDocument();
    expect(screen.getByTestId('requestFlyoutContent')).toBeInTheDocument();
  });

  it('shows the no metrics message for a connection without metrics', () => {
    render(
      <I18nProvider>
        <RequestFlyout
          {...baseProps}
          connection={{ sourceLabel: 'orders', targetLabel: 'orders-queue' }}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('requestFlyoutNoMetricsMessage')).toBeInTheDocument();
    expect(screen.queryByTestId('requestFlyoutContent')).not.toBeInTheDocument();
  });
});
