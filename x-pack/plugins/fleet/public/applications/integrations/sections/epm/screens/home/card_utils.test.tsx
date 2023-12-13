/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createIntegrationsTestRendererMock } from '../../../../../../mock';
import type { PackageListItem } from '../../../../types';

import { getIntegrationLabels } from './card_utils';

function renderIntegrationLabels(item: Partial<PackageListItem>) {
  const renderer = createIntegrationsTestRendererMock();

  return renderer.render(<>{getIntegrationLabels(item as any)}</>);
}

describe('Card utils', () => {
  describe('getIntegrationLabels', () => {
    it('should return an empty list for an integration without errors', () => {
      const res = renderIntegrationLabels({
        installationInfo: {
          install_status: 'installed',
        } as any,
      });
      const badges = res.container.querySelectorAll('.euiBadge');
      expect(badges).toHaveLength(0);
    });

    it('should return a badge for install_failed for an integration with status:install_failled', () => {
      const res = renderIntegrationLabels({
        installationInfo: {
          install_status: 'install_failed',
        } as any,
      });
      const badges = res.container.querySelectorAll('.euiBadge');
      expect(badges).toHaveLength(1);
      expect(res.queryByText('Install failed')).not.toBeNull();
    });

    it('should return a badge if there is an upgrade failed in the last_attempt_errors', () => {
      const res = renderIntegrationLabels({
        installationInfo: {
          version: '1.0.0',
          install_status: 'installed',
          latest_install_failed_attempts: [
            {
              created_at: new Date().toISOString(),
              error: {
                name: 'Test',
                message: 'test error 123',
              },
              target_version: '2.0.0',
            },
          ],
        } as any,
      });
      const badges = res.container.querySelectorAll('.euiBadge');
      expect(badges).toHaveLength(1);
      expect(res.queryByText('Update failed')).not.toBeNull();
    });
  });
});
