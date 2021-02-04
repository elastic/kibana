/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useKibana } from '../../../../common/lib/kibana';
import { TestProviders, mockIndexNames, mockIndexPattern } from '../../../../common/mock';
import { useTimelineKpis } from '../../../containers/kpis';
import { FlyoutHeader } from '.';
import { useSourcererScope } from '../../../../common/containers/sourcerer';
import { mockBrowserFields, mockDocValueFields } from '../../../../common/containers/source/mock';
import { useMountAppended } from '../../../../common/utils/use_mount_appended';
import { getEmptyValue } from '../../../../common/components/empty_value';

const mockUseSourcererScope: jest.Mock = useSourcererScope as jest.Mock;
jest.mock('../../../../common/containers/sourcerer');

const mockUseTimelineKpis: jest.Mock = useTimelineKpis as jest.Mock;
jest.mock('../../../containers/kpis', () => ({
  useTimelineKpis: jest.fn(),
}));
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
jest.mock('../../../../common/lib/kibana');

const mockUseTimelineKpiResponse = {
  processCount: 1,
  userCount: 1,
  sourceIpCount: 1,
  hostCount: 1,
  destinationIpCount: 1,
};
const defaultMocks = {
  browserFields: mockBrowserFields,
  docValueFields: mockDocValueFields,
  indexPattern: mockIndexPattern,
  loading: false,
  selectedPatterns: mockIndexNames,
};
describe('Timeline KPIs', () => {
  const mount = useMountAppended();

  beforeEach(() => {
    // Mocking these services is required for the header component to render.
    mockUseSourcererScope.mockImplementation(() => defaultMocks);
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

  describe('when the data is not loading and the response contains data', () => {
    beforeEach(() => {
      mockUseTimelineKpis.mockReturnValue([false, mockUseTimelineKpiResponse]);
    });
    it('renders the component, labels and values succesfully', async () => {
      const wrapper = mount(
        <TestProviders>
          <FlyoutHeader timelineId={'timeline-1'} />
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
          <FlyoutHeader timelineId={'timeline-1'} />
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
          <FlyoutHeader timelineId={'timeline-1'} />
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
});
