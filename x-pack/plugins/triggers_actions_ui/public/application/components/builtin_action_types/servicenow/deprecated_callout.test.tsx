/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { DeprecatedCallout } from './deprecated_callout';

describe('DeprecatedCallout', () => {
  const onMigrate = jest.fn();

  test('it renders correctly', () => {
    render(<DeprecatedCallout onMigrate={onMigrate} />, {
      wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
    });

    expect(screen.getByText('This connector type is deprecated')).toBeInTheDocument();
  });

  test('it calls onMigrate when pressing the button', () => {
    render(<DeprecatedCallout onMigrate={onMigrate} />, {
      wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
    });

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onMigrate).toHaveBeenCalled();
  });
});
