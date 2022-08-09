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

const data: TimelineEventsDetailsItem[] = [
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

describe('Insights', () => {
  beforeEach(() => {
    mockUseGetUserCasesPermissions.mockReturnValue(noCasesPermissions());
  });

  it('does not render when there is no content to show', () => {
    render(
      <TestProviders>
        <Insights browserFields={{}} eventId="test" data={[]} timelineId="" />
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
        <Insights browserFields={{}} eventId="test" data={[]} timelineId="" />
      </TestProviders>
    );

    expect(
      screen.queryByRole('heading', {
        name: i18n.INSIGHTS,
      })
    ).toBeInTheDocument();
  });

  describe('without platinum license', () => {
    it('should show an upsell', () => {
      licenseServiceMock.isPlatinumPlus.mockReturnValue(false);

      render(
        <TestProviders>
          <Insights browserFields={{}} eventId="test" data={data} timelineId="" />
        </TestProviders>
      );

      expect(screen.getByRole('link', { name: i18n.ALERT_UPSELL })).toBeInTheDocument();
      expect(screen.queryByTestId('related-alerts-by-ancestry')).not.toBeInTheDocument();
    });
  });

  describe('with platinum license', () => {
    it('should show insights for related alerts', () => {
      licenseServiceMock.isPlatinumPlus.mockReturnValue(true);

      render(
        <TestProviders>
          <Insights browserFields={{}} eventId="test" data={data} timelineId="" />
        </TestProviders>
      );

      expect(screen.getByTestId('related-alerts-by-ancestry')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: i18n.ALERT_UPSELL })).not.toBeInTheDocument();
    });
  });
});
