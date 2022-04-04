/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getByText, render } from '@testing-library/react';
import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { FormattedCount } from './formatted_count';

describe('FormattedCount', () => {
  test('return null if count is null', () => {
    const { container } = render(
      <IntlProvider locale={'en'}>
        <FormattedCount count={null} />
      </IntlProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  test('return count in bold if 0 <= count < 1000, count = 0 ', () => {
    const { container } = render(
      <IntlProvider locale={'en'}>
        <FormattedCount count={0} />
      </IntlProvider>
    );

    expect(getByText(container, '0')).toBeInTheDocument();
  });

  test('return count in bold if 0 <= count < 1000, count = 999', () => {
    const { container } = render(
      <IntlProvider locale={'en'}>
        <FormattedCount count={999} />
      </IntlProvider>
    );

    expect(getByText(container, '999')).toBeInTheDocument();
  });

  test('return formatted count, count > 1000', () => {
    const { container } = render(
      <IntlProvider locale={'en'}>
        <FormattedCount count={3650} />
      </IntlProvider>
    );

    expect(getByText(container, '3.65')).toBeInTheDocument();
    expect(getByText(container, 'K')).toBeInTheDocument();
  });

  test('return formatted count - count is a great number', () => {
    const { container } = render(
      <IntlProvider locale={'en'}>
        <FormattedCount count={3650000} />
      </IntlProvider>
    );

    expect(getByText(container, '3,650')).toBeInTheDocument();
    expect(getByText(container, 'K')).toBeInTheDocument();
  });
});
