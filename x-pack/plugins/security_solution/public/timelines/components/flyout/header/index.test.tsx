/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useKibana, useGetUserCasesPermissions } from '../../../../common/lib/kibana';
import { TestProviders, mockIndexNames, mockIndexPattern } from '../../../../common/mock';
import { TimelineId } from '../../../../../common/types/timeline';
import { useTimelineKpis } from '../../../containers/kpis';
import { FlyoutHeader } from '.';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { mockBrowserFields, mockDocValueFields } from '../../../../common/containers/source/mock';
import { useMountAppended } from '../../../../common/utils/use_mount_appended';
import { getEmptyValue } from '../../../../common/components/empty_value';

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
  docValueFields: mockDocValueFields,
  indexPattern: mockIndexPattern,
  loading: false,
  selectedPatterns: mockIndexNames,
};
describe('header', () => {
  const mount = useMountAppended();

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

    it('renders the button when the user has write permissions', () => {
      (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
        crud: true,
        read: false,
      });

      const wrapper = mount(
        <TestProviders>
          <FlyoutHeader timelineId={TimelineId.test} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="attach-timeline-case-button"]').exists()).toBeTruthy();
    });

    it('does not render the button when the user does not have write permissions', () => {
      (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
        crud: false,
        read: false,
      });

      const wrapper = mount(
        <TestProviders>
          <FlyoutHeader timelineId={TimelineId.test} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="attach-timeline-case-button"]').exists()).toBeFalsy();
    });
  });

  describe('Timeline KPIs', () => {
    describe('when the data is not loading and the response contains data', () => {
      beforeEach(() => {
        mockUseTimelineKpis.mockReturnValue([false, mockUseTimelineKpiResponse]);
      });
      it('renders the component, labels and values successfully', async () => {
        const wrapper = mount(
          <TestProviders>
            <FlyoutHeader timelineId={TimelineId.test} />
          </TestProviders>
        );
        expect(wrapper.find('[data-test-subj="siem-timeline-kpis"]').exists()).toEqual(true);
        // label
        expect(wrapper.find('[data-test-subj="siem-timeline-process-kpi"]').first().text()).toEqual(
          expect.stringContaining('Processes')
        );
        // value
        expect(wrapper.find('[data-test-subj="siem-timeline-process-kpi"]').first().text()).toEqual(
          expect.stringContaining('1')
        );
      });
    });

    describe('when the data is loading', () => {
      beforeEach(() => {
        mockUseTimelineKpis.mockReturnValue([true, mockUseTimelineKpiResponse]);
      });
      it('renders a loading indicator for values', async () => {
        const wrapper = mount(
          <TestProviders>
            <FlyoutHeader timelineId={TimelineId.test} />
          </TestProviders>
        );
        expect(wrapper.find('[data-test-subj="siem-timeline-process-kpi"]').first().text()).toEqual(
          expect.stringContaining('--')
        );
      });
    });

    describe('when the response is null and timeline is blank', () => {
      beforeEach(() => {
        mockUseTimelineKpis.mockReturnValue([false, null]);
      });
      it('renders labels and the default empty string', async () => {
        const wrapper = mount(
          <TestProviders>
            <FlyoutHeader timelineId={TimelineId.test} />
          </TestProviders>
        );

        expect(wrapper.find('[data-test-subj="siem-timeline-process-kpi"]').first().text()).toEqual(
          expect.stringContaining('Processes')
        );
        expect(wrapper.find('[data-test-subj="siem-timeline-process-kpi"]').first().text()).toEqual(
          expect.stringContaining(getEmptyValue())
        );
      });
    });

    describe('when the response contains numbers larger than one thousand', () => {
      beforeEach(() => {
        mockUseTimelineKpis.mockReturnValue([false, mockUseTimelineLargeKpiResponse]);
      });
      it('formats the numbers correctly', async () => {
        const wrapper = mount(
          <TestProviders>
            <FlyoutHeader timelineId={TimelineId.test} />
          </TestProviders>
        );
        expect(wrapper.find('[data-test-subj="siem-timeline-process-kpi"]').first().text()).toEqual(
          expect.stringContaining('1k')
        );
        expect(wrapper.find('[data-test-subj="siem-timeline-user-kpi"]').first().text()).toEqual(
          expect.stringContaining('1m')
        );
        expect(
          wrapper.find('[data-test-subj="siem-timeline-source-ip-kpi"]').first().text()
        ).toEqual(expect.stringContaining('1b'));
        expect(wrapper.find('[data-test-subj="siem-timeline-host-kpi"]').first().text()).toEqual(
          expect.stringContaining('999')
        );
      });
    });
  });
});
