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
import { useSpanDatabaseSection } from './span_db';

type SpanDb = NonNullable<Span['span']>['db'];

const TABS = [
  { id: 'metadata', label: 'Metadata' },
  { id: 'stack-trace', label: 'Stack Trace' },
];

function DatabaseSectionHost({ spanDb }: { spanDb?: SpanDb }) {
  const section = useSpanDatabaseSection(spanDb);
  return (
    <FlyoutTemplate onClose={jest.fn()} session="never" tabs={TABS} data-test-subj="spanFlyout">
      <FlyoutTemplate.Header title="Span" />
      <FlyoutTemplate.Body>
        {section}
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

const renderSection = (spanDb?: SpanDb) =>
  render(
    <EuiThemeProvider>
      <I18nProvider>
        <DatabaseSectionHost spanDb={spanDb} />
      </I18nProvider>
    </EuiThemeProvider>
  );

describe('useSpanDatabaseSection', () => {
  it('renders the statement in a titled section above the tab panel', () => {
    renderSection({ statement: 'SELECT * FROM users', type: 'sql' });

    const section = screen.getByRole('region', { name: 'Database statement' });
    expect(section).toHaveAttribute('data-test-subj', 'spanFlyoutDatabaseSection');
    expect(section).toHaveTextContent('SELECT * FROM users');
    expect(screen.getByTestId('metadataPanel')).not.toContainElement(section);
  });

  it('keeps the same section mounted when the tab changes', async () => {
    const user = userEvent.setup();
    renderSection({ statement: 'SELECT * FROM users', type: 'sql' });

    const section = screen.getByTestId('spanFlyoutDatabaseSection');
    await user.click(screen.getByRole('tab', { name: 'Stack Trace' }));

    expect(screen.getByTestId('stackTracePanel')).toBeInTheDocument();
    expect(screen.getByTestId('spanFlyoutDatabaseSection')).toBe(section);
    expect(section).toHaveTextContent('SELECT * FROM users');
  });

  it('does not render when spanDb is undefined', () => {
    renderSection();
    expect(screen.queryByTestId('spanFlyoutDatabaseSection')).not.toBeInTheDocument();
  });

  it('does not render when spanDb has no statement', () => {
    renderSection({ type: 'sql' });
    expect(screen.queryByTestId('spanFlyoutDatabaseSection')).not.toBeInTheDocument();
  });

  it('does not render when spanDb.statement is an empty string', () => {
    renderSection({ statement: '', type: 'sql' });
    expect(screen.queryByTestId('spanFlyoutDatabaseSection')).not.toBeInTheDocument();
  });
});
