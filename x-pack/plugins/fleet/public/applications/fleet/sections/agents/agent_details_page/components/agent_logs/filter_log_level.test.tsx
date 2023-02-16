/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { LogLevelFilter } from './filter_log_level';

const renderComponent = (props: React.ComponentProps<typeof LogLevelFilter>) => {
  return render(
    <IntlProvider timeZone="UTC" locale="en">
      <LogLevelFilter {...props} />
    </IntlProvider>
  );
};

jest.mock('../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../hooks'),
  useStartServices: jest.fn().mockReturnValue({
    data: {
      dataViews: {
        getFieldsForWildcard: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue([]),
      },
    },
    unifiedSearch: {
      autocomplete: {
        getValueSuggestions: jest.fn().mockResolvedValue(['error', 'warn', 'info', 'debug']),
      },
    },
  }),
}));

describe('LogLevelFilter', () => {
  const { getByRole, getByText } = renderComponent({
    selectedLevels: [],
    onToggleLevel: () => {},
  });

  it('Renders all statuses', () => {
    act(() => {
      fireEvent.click(getByRole('button'));
    });

    expect(getByText('error')).toBeInTheDocument();
    expect(getByText('warn')).toBeInTheDocument();
    expect(getByText('info')).toBeInTheDocument();
    expect(getByText('debug')).toBeInTheDocument();
  });
});
