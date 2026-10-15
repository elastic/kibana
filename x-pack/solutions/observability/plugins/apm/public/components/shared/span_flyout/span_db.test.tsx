/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiThemeProvider } from '@elastic/eui';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { Span } from '../../../../typings/es_schemas/ui/span';
import { useSpanDatabaseCallout } from './span_db';

type SpanDb = NonNullable<Span['span']>['db'];

const TABS = [
  { id: 'metadata', label: 'Metadata' },
  { id: 'stack-trace', label: 'Stack Trace' },
];

function DatabaseCalloutHost({ spanDb }: { spanDb?: SpanDb }) {
  const callout = useSpanDatabaseCallout(spanDb);
  return (
    <FlyoutTemplate onClose={jest.fn()} session="never" tabs={TABS} data-test-subj="spanFlyout">
      <FlyoutTemplate.Header title="Span" />
      <FlyoutTemplate.Body>
        {callout}
        <FlyoutTemplate.Body.TabPanel tabId="metadata">
          <div data-test-subj="metadataPanel">metadata</div>
        </FlyoutTemplate.Body.TabPanel>
        <FlyoutTemplate.Body.TabPanel tabId="stack-trace">
          <div data-test-subj="stackTracePanel">stack trace</div>
        </FlyoutTemplate.Body.TabPanel>
      </FlyoutTemplate.Body>
    </FlyoutTemplate>
  );
}

const renderCallout = (spanDb?: SpanDb) =>
  render(
    <EuiThemeProvider>
      <I18nProvider>
        <DatabaseCalloutHost spanDb={spanDb} />
      </I18nProvider>
    </EuiThemeProvider>
  );

describe('useSpanDatabaseCallout', () => {
  it('renders the statement in an info callout', () => {
    renderCallout({ statement: 'SELECT * FROM users', type: 'sql' });

    const callout = screen.getByTestId('spanFlyoutDatabaseCallout');
    expect(callout).toHaveTextContent('Database statement');
    expect(callout).toHaveTextContent('SELECT * FROM users');
    expect(screen.getByTestId('metadataPanel')).not.toContainElement(callout);
  });

  it('keeps the same callout mounted when the tab changes', async () => {
    const user = userEvent.setup();
    renderCallout({ statement: 'SELECT * FROM users', type: 'sql' });

    const callout = screen.getByTestId('spanFlyoutDatabaseCallout');
    await user.click(screen.getByRole('tab', { name: 'Stack Trace' }));

    expect(screen.getByTestId('stackTracePanel')).toBeInTheDocument();
    expect(screen.getByTestId('spanFlyoutDatabaseCallout')).toBe(callout);
    expect(callout).toHaveTextContent('SELECT * FROM users');
  });

  it('does not render when spanDb is undefined', () => {
    renderCallout();
    expect(screen.queryByTestId('spanFlyoutDatabaseCallout')).not.toBeInTheDocument();
  });

  it('does not render when spanDb has no statement', () => {
    renderCallout({ type: 'sql' });
    expect(screen.queryByTestId('spanFlyoutDatabaseCallout')).not.toBeInTheDocument();
  });

  it('does not render when spanDb.statement is an empty string', () => {
    renderCallout({ statement: '', type: 'sql' });
    expect(screen.queryByTestId('spanFlyoutDatabaseCallout')).not.toBeInTheDocument();
  });
});
