/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@kbn/react-query';
import type { Preview } from '@storybook/react';

const preview: Preview = {
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      return (
        <KibanaContextProvider
          services={{
            http: {
              basePath: {
                prepend: (path: string) => path,
              },
            },
            data: {},
          }}
        >
          <MemoryRouter>
            <QueryClientProvider client={queryClient}>
              <Story />
            </QueryClientProvider>
          </MemoryRouter>
        </KibanaContextProvider>
      );
    },
  ],
  parameters: {
    options: {
      storySort: {
        order: [
          'app',
          [
            'Nightshift',
            [
              'NightshiftApp',
              [
                'Act 0: No Detection Workflows',
                'Act 1: We Know Your System',
                'Act 2: Something Is Wrong',
              ],
            ],
          ],
        ],
      },
      selectedPanel: 'storybook/canvas',
      initialActive: 'canvas',
    },
  },
};

export default preview;
