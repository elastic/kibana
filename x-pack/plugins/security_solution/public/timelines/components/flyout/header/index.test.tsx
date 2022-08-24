/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { useKibana, useGetUserCasesPermissions } from '../../../../common/lib/kibana';
import { TestProviders, mockIndexNames, mockIndexPattern } from '../../../../common/mock';
import { TimelineId } from '../../../../../common/types/timeline';
import { useTimelineKpis } from '../../../containers/kpis';
import { FlyoutHeader } from '.';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { mockBrowserFields } from '../../../../common/containers/source/mock';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { allCasesPermissions, readCasesPermissions } from '../../../../cases_test_utils';

const mockUseSourcererDataView: jest.Mock = useSourcererDataView as jest.Mock;
jest.mock('../../../../common/containers/sourcerer');

const mockUseTimelineKpis: jest.Mock = useTimelineKpis as jest.Mock;
jest.mock('../../../containers/kpis', () => ({
  useTimelineKpis: jest.fn(),
}));
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
jest.mock('../../../../common/lib/kibana');
jest.mock('@kbn/i18n-react', () => {
  const originalModule = jest.requireActual('@kbn/i18n-react');
  const FormattedRelative = jest.fn().mockImplementation(() => '20 hours ago');

  return {
    ...originalModule,
    FormattedRelative,
  };
});
const mockUseTimelineKpiResponse = {
  processCount: 1,
  userCount: 1,
  sourceIpCount: 1,
  hostCount: 1,
  destinationIpCount: 1,
};

const mockUseTimelineLargeKpiResponse = {
  processCount: 1000,
  userCount: 1000000,
  sourceIpCount: 1000000000,
  hostCount: 999,
  destinationIpCount: 1,
};
const defaultMocks = {
  browserFields: mockBrowserFields,
  indexPattern: mockIndexPattern,
  loading: false,
  selectedPatterns: mockIndexNames,
};
describe('header', () => {
  beforeEach(() => {
    // Mocking these services is required for the header component to render.
    mockUseSourcererDataView.mockImplementation(() => defaultMocks);
    useKibanaMock().services.application.capabilities = {
      navLinks: {},
      management: {},
      catalogue: {},
      actions: { show: true, crud: true },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AddToCaseButton', () => {
    beforeEach(() => {
      mockUseTimelineKpis.mockReturnValue([false, mockUseTimelineKpiResponse]);
    });

    it('renders the button when the user has create and read permissions', () => {
      (useGetUserCasesPermissions as jest.Mock).mockReturnValue(allCasesPermissions());

      render(
        <TestProviders>
          <FlyoutHeader timelineId={TimelineId.test} />
        </TestProviders>
      );

      expect(screen.getByTestId('attach-timeline-case-button')).toBeInTheDocument();
    });

    it('does not render the button when the user does not have create permissions', () => {
      (useGetUserCasesPermissions as jest.Mock).mockReturnValue(readCasesPermissions());

      render(
        <TestProviders>
          <FlyoutHeader timelineId={TimelineId.test} />
        </TestProviders>
      );

      expect(screen.queryByTestId('attach-timeline-case-button')).not.toBeInTheDocument();
    });
  });

  describe('Timeline KPIs', () => {
    describe('when the data is not loading and the response contains data', () => {
      beforeEach(() => {
        mockUseTimelineKpis.mockReturnValue([false, mockUseTimelineKpiResponse]);
      });
      it('renders the component, labels and values successfully', () => {
        render(
          <TestProviders>
            <FlyoutHeader timelineId={TimelineId.test} />
          </TestProviders>
        );
        expect(screen.getByTestId('siem-timeline-kpis')).toBeInTheDocument();
        // label
        expect(screen.getByText('Processes')).toBeInTheDocument();
        // value
        expect(screen.getByTestId('siem-timeline-process-kpi').textContent).toContain('1');
      });
    });

    describe('when the data is loading', () => {
      beforeEach(() => {
        mockUseTimelineKpis.mockReturnValue([true, mockUseTimelineKpiResponse]);
      });
      it('renders a loading indicator for values', async () => {
        render(
          <TestProviders>
            <FlyoutHeader timelineId={TimelineId.test} />
          </TestProviders>
        );
        expect(screen.getAllByText('--')).not.toHaveLength(0);
      });
    });

    describe('when the response is null and timeline is blank', () => {
      beforeEach(() => {
        mockUseTimelineKpis.mockReturnValue([false, null]);
      });
      it('renders labels and the default empty string', () => {
        render(
          <TestProviders>
            <FlyoutHeader timelineId={TimelineId.test} />
          </TestProviders>
        );
        expect(screen.getByText('Processes')).toBeInTheDocument();
        expect(screen.getAllByText(getEmptyValue())).not.toHaveLength(0);
      });
    });

    describe('when the response contains numbers larger than one thousand', () => {
      beforeEach(() => {
        mockUseTimelineKpis.mockReturnValue([false, mockUseTimelineLargeKpiResponse]);
      });
      it('formats the numbers correctly', () => {
        render(
          <TestProviders>
            <FlyoutHeader timelineId={TimelineId.test} />
          </TestProviders>
        );
        expect(screen.getByText('1k', { selector: '.euiTitle' })).toBeInTheDocument();
        expect(screen.getByText('1m', { selector: '.euiTitle' })).toBeInTheDocument();
        expect(screen.getByText('1b', { selector: '.euiTitle' })).toBeInTheDocument();
        expect(screen.getByText('999', { selector: '.euiTitle' })).toBeInTheDocument();
      });
    });
  });
});
