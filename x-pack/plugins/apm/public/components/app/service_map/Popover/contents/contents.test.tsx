/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MockApmPluginContextWrapper } from '../../../../../context/apm_plugin/mock_apm_plugin_context';
import { Contents } from './';

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/service-map']}>
      <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
    </MemoryRouter>
  );
}

describe('Contents', () => {
  describe('with service data', () => {
    it('renders contents for a service', () => {
      const props = { onFocusClick: () => {}, selectedNodeData: {} };

      render(<Contents {...props} />, { wrapper: Wrapper });

      expect(
        screen.getByRole('link', { name: /service details/i })
      ).toBeInTheDocument();
    });
  });

  describe('with externals data', () => {
    it('renders an externals list', () => {
      const props = {
        onFocusClick: () => {},
        selectedNodeData: {
          id: 'resourceGroup{elastic-co-frontend}',
          'span.type': 'external',
          label: '2 resources',
          groupedConnections: [
            {
              label: '813-mam-392.mktoresp.com:443',
              'span.subtype': 'http',
              'span.destination.service.resource':
                '813-mam-392.mktoresp.com:443',
              'span.type': 'external',
              id: '>813-mam-392.mktoresp.com:443',
            },

            {
              label: 'x.clearbit.com:443',
              'span.subtype': 'http',
              'span.destination.service.resource': 'x.clearbit.com:443',
              'span.type': 'external',
              id: '>x.clearbit.com:443',
            },
          ],
        },
      };

      render(<Contents {...props} />);

      expect(
        screen.getByText(/813-mam-392.mktoresp.com:443/)
      ).toBeInTheDocument();
    });
  });
});
