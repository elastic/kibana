/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { coreStartMock, render } from '../../helpers/test_helper';
import { SettingsPage } from './settings_page';

describe('Settings Page', () => {
  it('should navigate to home when not authorized', () => {
    render(<SettingsPage />, {
      coreStart: {
        application: {
          capabilities: {
            observabilityAIAssistant: {
              show: false,
            },
          },
        },
      },
    });

    expect(coreStartMock.application.navigateToApp).toBeCalledWith('home');
  });

  it('should render settings and knowledge base tabs', () => {
    const { getByTestId } = render(<SettingsPage />);

    expect(getByTestId('settingsPageTab-settings')).toBeInTheDocument();
    expect(getByTestId('settingsPageTab-knowledge_base')).toBeInTheDocument();
  });

  it('should set breadcrumbs', () => {
    const setBreadcrumbs = jest.fn();
    render(<SettingsPage />, {
      appContextValue: { setBreadcrumbs },
    });

    expect(setBreadcrumbs).toHaveBeenCalledWith([
      {
        text: 'AI Assistants',
        onClick: expect.any(Function),
      },
      {
        text: 'Observability',
      },
    ]);
  });
});
