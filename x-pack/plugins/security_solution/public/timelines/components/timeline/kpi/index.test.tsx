/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { useTimelineKpis } from '../../../containers/kpis';
import { TimelineKpi } from '.';
import { TimelineId } from '../../../../../common/types';
import { getEmptyValue } from '../../../../common/components/empty_value';

jest.mock('../../../containers/kpis', () => ({
  useTimelineKpis: jest.fn(),
}));

jest.mock('../../../../common/lib/kibana');

jest.mock('@kbn/i18n-react', () => {
  const originalModule = jest.requireActual('@kbn/i18n-react');
  const FormattedRelative = jest.fn().mockImplementation(() => '20 hours ago');

  return {
    ...originalModule,
    FormattedRelative,
  };
});

const mockUseTimelineKpis: jest.Mock = useTimelineKpis as jest.Mock;

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

describe('Timeline KPIs', () => {
  describe('when the data is not loading and the response contains data', () => {
    beforeEach(() => {
      mockUseTimelineKpis.mockReturnValue([false, mockUseTimelineKpiResponse]);
    });
    it('renders the component, labels and values successfully', () => {
      render(
        <TestProviders>
          <TimelineKpi timelineId={TimelineId.test} />
        </TestProviders>
      );
      expect(screen.getByTestId('siem-timeline-kpis')).toBeInTheDocument();
      // label
      expect(screen.getByText('Processes :')).toBeInTheDocument();
      // value
      expect(screen.getByTestId('siem-timeline-process-kpi').textContent).toContain('1');
    });
  });

  describe('when the response is null and timeline is blank', () => {
    beforeEach(() => {
      mockUseTimelineKpis.mockReturnValue([false, null]);
    });
    it('renders labels and the default empty string', () => {
      render(
        <TestProviders>
          <TimelineKpi timelineId={TimelineId.test} />
        </TestProviders>
      );
      expect(screen.getByText('Processes :')).toBeInTheDocument();
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
          <TimelineKpi timelineId={TimelineId.test} />
        </TestProviders>
      );
      expect(screen.getByTitle('1k')).toBeInTheDocument();
      expect(screen.getByTitle('1m')).toBeInTheDocument();
      expect(screen.getByTitle('1b')).toBeInTheDocument();
      expect(screen.getByTitle('999')).toBeInTheDocument();
    });
  });
});
