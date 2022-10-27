/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../mock';

import type { TimelineEventsDetailsItem } from '../../../../../common/search_strategy/timeline';
import { useKibana as mockUseKibana } from '../../../lib/kibana/__mocks__';
import { useGetUserCasesPermissions } from '../../../lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../../../hooks/use_experimental_features';
import { licenseService } from '../../../hooks/use_license';
import { noCasesPermissions, readCasesPermissions } from '../../../../cases_test_utils';
import { Insights } from './insights';
import * as i18n from './translations';

const mockedUseKibana = mockUseKibana();
jest.mock('../../../lib/kibana', () => {
  const original = jest.requireActual('../../../lib/kibana');

  return {
    ...original,
    useGetUserCasesPermissions: jest.fn(),
    useToasts: jest.fn().mockReturnValue({ addWarning: jest.fn() }),
    useKibana: () => ({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        cases: {
          api: {
            getRelatedCases: jest.fn(),
          },
        },
      },
    }),
  };
});
const mockUseGetUserCasesPermissions = useGetUserCasesPermissions as jest.Mock;

jest.mock('../../../hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
    isEnterprise: jest.fn(() => true),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});
const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;

jest.mock('../../../hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));
const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;

const dataWithoutAgentType: TimelineEventsDetailsItem[] = [
  {
    category: 'process',
    field: 'process.entity_id',
    isObjectArray: false,
    values: ['32082y34028u34'],
  },
  {
    category: 'kibana',
    field: 'kibana.alert.ancestors.id',
    isObjectArray: false,
    values: ['woeurhw98rhwr'],
  },
  {
    category: 'kibana',
    field: 'kibana.alert.rule.parameters.index',
    isObjectArray: false,
    values: ['fakeindex'],
  },
];

const data: TimelineEventsDetailsItem[] = [
  ...dataWithoutAgentType,
  {
    category: 'agent',
    field: 'agent.type',
    isObjectArray: false,
    values: ['endpoint'],
  },
];

describe('Insights', () => {
  beforeEach(() => {
    mockUseGetUserCasesPermissions.mockReturnValue(noCasesPermissions());
  });

  it('does not render when there is no content to show', () => {
    render(
      <TestProviders>
        <Insights browserFields={{}} eventId="test" data={[]} scopeId="" />
      </TestProviders>
    );

    expect(
      screen.queryByRole('heading', {
        name: i18n.INSIGHTS,
      })
    ).not.toBeInTheDocument();
  });

  it('renders when there is at least one insight element to show', () => {
    // One of the insights modules is the module showing related cases.
    // It will show for all users that are able to read case data.
    // Enabling that permission, will show the case insight module which
    // is necessary to pass this test.
    mockUseGetUserCasesPermissions.mockReturnValue(readCasesPermissions());

    render(
      <TestProviders>
        <Insights browserFields={{}} eventId="test" data={[]} scopeId="" />
      </TestProviders>
    );

    expect(
      screen.queryByRole('heading', {
        name: i18n.INSIGHTS,
      })
    ).toBeInTheDocument();
  });

  describe('with feature flag enabled', () => {
    describe('with platinum license', () => {
      beforeAll(() => {
        licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
      });

      it('should show insights for related alerts by process ancestry', () => {
        render(
          <TestProviders>
            <Insights browserFields={{}} eventId="test" data={data} scopeId="" />
          </TestProviders>
        );

        expect(screen.getByTestId('related-alerts-by-ancestry')).toBeInTheDocument();
        expect(
          screen.queryByRole('button', { name: new RegExp(i18n.INSIGHTS_UPSELL) })
        ).not.toBeInTheDocument();
      });

      describe('without process ancestry info', () => {
        it('should not show the related alerts by process ancestry insights module', () => {
          render(
            <TestProviders>
              <Insights browserFields={{}} eventId="test" data={dataWithoutAgentType} scopeId="" />
            </TestProviders>
          );

          expect(screen.queryByTestId('related-alerts-by-ancestry')).not.toBeInTheDocument();
        });
      });
    });

    describe('without platinum license', () => {
      it('should show an upsell for related alerts by process ancestry', () => {
        licenseServiceMock.isPlatinumPlus.mockReturnValue(false);

        render(
          <TestProviders>
            <Insights browserFields={{}} eventId="test" data={data} scopeId="" />
          </TestProviders>
        );

        expect(
          screen.getByRole('button', { name: new RegExp(i18n.INSIGHTS_UPSELL) })
        ).toBeInTheDocument();
        expect(screen.queryByTestId('related-alerts-by-ancestry')).not.toBeInTheDocument();
      });
    });
  });

  describe('with feature flag disabled', () => {
    it('should not render neither the upsell, nor the insights for alerts by process ancestry', () => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(false);

      render(
        <TestProviders>
          <Insights browserFields={{}} eventId="test" data={data} scopeId="" />
        </TestProviders>
      );

      expect(screen.queryByTestId('related-alerts-by-ancestry')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: new RegExp(i18n.INSIGHTS_UPSELL) })
      ).not.toBeInTheDocument();
    });
  });
});
