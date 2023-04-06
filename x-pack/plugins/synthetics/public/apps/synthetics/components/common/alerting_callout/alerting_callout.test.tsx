/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { render } from '../../../utils/testing/rtl_helpers';
import { AlertingCallout } from './alerting_callout';
import * as alertingHooks from '../../settings/alerting_defaults/hooks/use_alerting_defaults';

jest.mock('../../../contexts', () => ({
  ...jest.requireActual('../../../contexts'),
  useSyntheticsStartPlugins: jest.fn().mockReturnValue({
    share: {
      url: {
        locators: {
          get: jest.fn().mockReturnValue({
            getUrl: jest.fn().mockResolvedValue('url'),
          }),
        },
      },
    },
  }),
}));

describe('AlertingCallout', () => {
  it.each([
    [false, false, false],
    [false, true, true],
    [true, false, false],
    [true, true, false],
  ])('renders correctly', async (hasConnectors, statusAlertEnabled, shouldShowCallout) => {
    jest.spyOn(alertingHooks, 'useAlertingDefaults').mockReturnValue({
      loading: false,
      connectors: [],
      actionTypes: hasConnectors
        ? [
            {
              id: 'id',
              name: 'name',
              enabled: true,
              enabledInConfig: true,
              enabledInLicense: true,
              minimumLicenseRequired: 'platinum',
              supportedFeatureIds: ['synthetics'],
            },
          ]
        : [],
      options: [
        {
          value: 'test',
          label: 'test',
          'data-test-subj': 'test',
        },
      ],
    });

    const { getByText, queryByText } = render(<AlertingCallout />, {
      state: {
        overview: {
          data: {
            total: 1,
            allMonitorIds: ['1'],
            monitors: [
              {
                id: '1',
                configId: '1',
                location: {
                  id: 'us_central',
                  isServiceManaged: true,
                },
                name: `Monitor 1`,
                isEnabled: true,
                isStatusAlertEnabled: statusAlertEnabled,
                type: 'browser',
                tags: [],
              },
            ],
          },
        },
      },
    });

    await waitFor(() => {
      if (shouldShowCallout) {
        expect(getByText(/Alert connectors missing/)).toBeInTheDocument();
      } else {
        expect(queryByText(/Alert connectors missing/)).not.toBeInTheDocument();
      }
    });
  });

  it.each([
    [false, false, false],
    [false, true, true],
    [true, false, false],
    [true, true, false],
  ])(
    'overwrites rendering with isAlertingEnabled prop',
    async (hasConnectors, statusAlertEnabled, shouldShowCallout) => {
      jest.spyOn(alertingHooks, 'useAlertingDefaults').mockReturnValue({
        loading: false,
        connectors: [],
        actionTypes: hasConnectors
          ? [
              {
                id: 'id',
                name: 'name',
                enabled: true,
                enabledInConfig: true,
                enabledInLicense: true,
                minimumLicenseRequired: 'platinum',
                supportedFeatureIds: ['synthetics'],
              },
            ]
          : [],
        options: [
          {
            value: 'test',
            label: 'test',
            'data-test-subj': 'test',
          },
        ],
      });

      const { getByText, queryByText } = render(
        <AlertingCallout isAlertingEnabled={statusAlertEnabled} />
      );

      await waitFor(() => {
        if (shouldShowCallout) {
          expect(getByText(/Alert connectors missing/)).toBeInTheDocument();
        } else {
          expect(queryByText(/Alert connectors missing/)).not.toBeInTheDocument();
        }
      });
    }
  );
});
