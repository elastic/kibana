/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProviderDecorator } from '@kbn/kibana-react-plugin/common';

/**
 * Global Storybook decorators.
 *
 * - `EuiThemeProviderDecorator` wires the EUI theme so components can
 *   resolve `useEuiTheme()` tokens.
 * - `I18nProvider` wires `react-intl` so components that use
 *   `<FormattedRelative />`, `<FormattedMessage />`, etc. don't throw
 *   ("intl is undefined") in stories.
 */
export const decorators = [
  EuiThemeProviderDecorator,
  (Story: React.ComponentType) => (
    <I18nProvider>
      <Story />
    </I18nProvider>
  ),
];
