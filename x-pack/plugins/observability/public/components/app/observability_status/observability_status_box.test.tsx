/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ObservabilityStatusBox } from './observability_status_box';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

describe('ObservabilityStatusBox', () => {
  describe('Empty state', () => {
    beforeEach(() => {
      const props = {
        id: 'logs',
        title: 'Logs',
        hasData: false,
        description: 'test description',
        modules: [],
        addTitle: 'logs add title',
        addLink: 'http://example.com',
        learnMoreLink: 'learnMoreUrl.com',
        goToAppTitle: 'go to app title',
        goToAppLink: 'go to app link',
        weight: 1,
      };

      render(
        <IntlProvider locale="en">
          <ObservabilityStatusBox {...props} />
        </IntlProvider>
      );
    });

    it('should have a description', () => {
      expect(screen.getByText('test description')).toBeInTheDocument();
    });

    it('should have a learn more button', () => {
      const learnMoreLink = screen.getByText('Learn more') as HTMLElement;
      expect(learnMoreLink.closest('a')?.href).toContain('learnMoreUrl.com');
    });
  });

  describe('Has data state', () => {
    beforeEach(() => {
      const props = {
        id: 'logs',
        title: 'Logs',
        hasData: true,
        description: 'test description',
        modules: [
          { name: 'module1', hasData: true },
          { name: 'module2', hasData: false },
          { name: 'module3', hasData: true },
        ],
        addTitle: 'logs add title',
        addLink: 'addIntegrationUrl.com',
        learnMoreLink: 'http://example.com',
        goToAppTitle: 'go to app title',
        goToAppLink: 'go to app link',
        weight: 1,
      };

      render(
        <IntlProvider locale="en">
          <ObservabilityStatusBox {...props} />
        </IntlProvider>
      );
    });

    // it('should have a check icon', () => {});

    it('should have the integration link', () => {
      const addIntegrationLink = screen.getByText('logs add title') as HTMLElement;
      expect(addIntegrationLink.closest('a')?.href).toContain('addIntegrationUrl.com');
    });

    it('should have the list of modules', () => {
      const list = screen.getByRole('list');
      expect(list.children.length).toBe(3);
    });
  });
});
