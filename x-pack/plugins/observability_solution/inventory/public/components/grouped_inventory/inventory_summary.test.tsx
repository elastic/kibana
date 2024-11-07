/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { InventorySummary } from './inventory_summary';

// Do not test the GroupSelector, as it needs a lot more complicated setup
jest.mock('./group_selector', () => ({
  GroupSelector: () => <>Selector</>,
}));

function MockEnvWrapper({ children }: { children?: React.ReactNode }) {
  return (
    <I18nProvider>
      <EuiThemeProvider>{children}</EuiThemeProvider>
    </I18nProvider>
  );
}

describe('InventorySummary', () => {
  it('renders the total entities without any group totals', () => {
    render(<InventorySummary totalEntities={10} />, { wrapper: MockEnvWrapper });
    expect(screen.getByText('10 Entities')).toBeInTheDocument();
    expect(screen.queryByTestId('inventorySummaryGroupsTotal')).not.toBeInTheDocument();
  });
  it('renders the total entities with group totals', () => {
    render(<InventorySummary totalEntities={15} totalGroups={3} />, { wrapper: MockEnvWrapper });
    expect(screen.getByText('15 Entities')).toBeInTheDocument();
    expect(screen.queryByText('3 Groups')).toBeInTheDocument();
  });
  it("won't render either totals when not provided anything", () => {
    render(<InventorySummary />, { wrapper: MockEnvWrapper });
    expect(screen.queryByTestId('inventorySummaryEntitiesTotal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('inventorySummaryGroupsTotal')).not.toBeInTheDocument();
  });
});
