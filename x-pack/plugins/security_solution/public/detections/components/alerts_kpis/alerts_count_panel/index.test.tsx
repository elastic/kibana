/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { AlertsCountPanel } from '.';

import type { Status } from '../../../../../common/api/detection_engine';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { DEFAULT_STACK_BY_FIELD, DEFAULT_STACK_BY_FIELD1 } from '../common/config';
import { TestProviders } from '../../../../common/mock';
import { ChartContextMenu } from '../../../pages/detection_engine/chart_panels/chart_context_menu';
import { TABLE } from '../../../pages/detection_engine/chart_panels/chart_select/translations';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { VisualizationEmbeddable } from '../../../../common/components/visualization_actions/visualization_embeddable';
import type { ExperimentalFeatures } from '../../../../../common/experimental_features';
import { allowedExperimentalValues } from '../../../../../common/experimental_features';

const from = '2022-07-28T08:20:18.966Z';
const to = '2022-07-28T08:20:18.966Z';
jest.mock('../../../../common/containers/use_global_time', () => {
  const actual = jest.requireActual('../../../../common/containers/use_global_time');
  return {
    ...actual,
    useGlobalTime: jest
      .fn()
      .mockReturnValue({ from, to, setQuery: jest.fn(), deleteQuery: jest.fn() }),
  };
});

jest.mock('../../../../common/containers/query_toggle');
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

jest.mock('../../../../common/hooks/use_experimental_features');
jest.mock('../../../../common/components/page/use_refetch_by_session');
jest.mock('../../../../common/components/visualization_actions/visualization_embeddable');
jest.mock('../../../../common/components/page/use_refetch_by_session');
jest.mock('../common/hooks', () => ({
  useInspectButton: jest.fn(),
  useStackByFields: jest.fn().mockReturnValue(() => []),
}));
const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.Mock;
const getMockUseIsExperimentalFeatureEnabled =
  (mockMapping?: Partial<ExperimentalFeatures>) => (flag: keyof typeof allowedExperimentalValues) =>
    mockMapping ? mockMapping?.[flag] : allowedExperimentalValues?.[flag];
jest.mock('../../../../common/hooks/use_experimental_features');

const defaultProps = {
  inspectTitle: TABLE,
  signalIndexName: 'signalIndexName',
  stackByField0: DEFAULT_STACK_BY_FIELD,
  stackByField1: DEFAULT_STACK_BY_FIELD1,
  setStackByField0: jest.fn(),
  setStackByField1: jest.fn(),
  isExpanded: true,
  setIsExpanded: jest.fn(),
  showBuildingBlockAlerts: false,
  showOnlyThreatIndicatorAlerts: false,
  status: 'open' as Status,
  extraActions: [{ id: 'resetGroupByFields' }] as Action[],
};
const mockSetToggle = jest.fn();
const mockUseQueryToggle = useQueryToggle as jest.Mock;

describe('AlertsCountPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: mockSetToggle });
    mockUseIsExperimentalFeatureEnabled.mockImplementation(
      getMockUseIsExperimentalFeatureEnabled({
        alertsPageChartsEnabled: false,
      })
    );
  });

  it('renders correctly', async () => {
    await act(async () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsCountPanel {...defaultProps} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="alertsCountPanel"]').exists()).toBeTruthy();
    });
  });

  it('renders with the specified `alignHeader` alignment', async () => {
    await act(async () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsCountPanel {...defaultProps} alignHeader="flexEnd" />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="headerSectionInnerFlexGroup"]').last().getDOMNode().className
      ).toContain('flexEnd');
    });
  });

  it('renders the inspect button by default', async () => {
    await act(async () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsCountPanel {...defaultProps} alignHeader="flexEnd" />
        </TestProviders>
      );

      expect(wrapper.find('button[data-test-subj="inspect-icon-button"]').first().exists()).toBe(
        true
      );
    });
  });

  it('it does NOT render the inspect button when a `chartOptionsContextMenu` is provided', async () => {
    const chartOptionsContextMenu = (queryId: string) => (
      <ChartContextMenu
        defaultStackByField={DEFAULT_STACK_BY_FIELD}
        defaultStackByField1={DEFAULT_STACK_BY_FIELD1}
        queryId={queryId}
        setStackBy={jest.fn()}
        setStackByField1={jest.fn()}
      />
    );

    await act(async () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsCountPanel {...defaultProps} chartOptionsContextMenu={chartOptionsContextMenu} />
        </TestProviders>
      );

      expect(wrapper.find('button[data-test-subj="inspect-icon-button"]').first().exists()).toBe(
        false
      );
    });
  });

  describe('toggleQuery', () => {
    it('toggles', async () => {
      await act(async () => {
        const wrapper = mount(
          <TestProviders>
            <AlertsCountPanel {...defaultProps} />
          </TestProviders>
        );
        wrapper.find('[data-test-subj="query-toggle-header"]').first().simulate('click');
        expect(mockSetToggle).toBeCalledWith(false);
      });
    });
    it('alertsPageChartsEnabled is false and toggleStatus=true, render', async () => {
      await act(async () => {
        const wrapper = mount(
          <TestProviders>
            <AlertsCountPanel {...defaultProps} />
          </TestProviders>
        );
        expect(wrapper.find('[data-test-subj="visualization-embeddable"]').exists()).toEqual(true);
      });
    });
    it('alertsPageChartsEnabled is false and toggleStatus=false, hide', async () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
      await act(async () => {
        const wrapper = mount(
          <TestProviders>
            <AlertsCountPanel {...defaultProps} />
          </TestProviders>
        );
        expect(wrapper.find('[data-test-subj="visualization-embeddable"]').exists()).toEqual(false);
      });
    });

    it('alertsPageChartsEnabled is true and isExpanded=true, render', async () => {
      mockUseIsExperimentalFeatureEnabled.mockImplementation(
        getMockUseIsExperimentalFeatureEnabled({
          alertsPageChartsEnabled: true,
        })
      );
      await act(async () => {
        const wrapper = mount(
          <TestProviders>
            <AlertsCountPanel {...defaultProps} />
          </TestProviders>
        );
        expect(wrapper.find('[data-test-subj="visualization-embeddable"]').exists()).toEqual(true);
      });
    });
    it('alertsPageChartsEnabled is true and isExpanded=false, hide', async () => {
      mockUseIsExperimentalFeatureEnabled.mockImplementation(
        getMockUseIsExperimentalFeatureEnabled({
          alertsPageChartsEnabled: true,
        })
      );
      await act(async () => {
        const wrapper = mount(
          <TestProviders>
            <AlertsCountPanel {...defaultProps} isExpanded={false} />
          </TestProviders>
        );
        expect(wrapper.find('[data-test-subj="visualization-embeddable"]').exists()).toEqual(false);
      });
    });
  });
});

describe('Visualization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: mockSetToggle });
    mockUseIsExperimentalFeatureEnabled.mockImplementation(
      getMockUseIsExperimentalFeatureEnabled({
        alertsPageChartsEnabled: false,
      })
    );
  });

  it('should render embeddable', async () => {
    await act(async () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsCountPanel {...defaultProps} />
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="visualization-embeddable"]').exists()).toBeTruthy();
    });
  });

  it('should render with provided height', async () => {
    await act(async () => {
      mount(
        <TestProviders>
          <AlertsCountPanel {...defaultProps} />
        </TestProviders>
      );
      expect((VisualizationEmbeddable as unknown as jest.Mock).mock.calls[0][0].height).toEqual(
        218
      );
    });
  });

  it('should render with extra actions', async () => {
    await act(async () => {
      mount(
        <TestProviders>
          <AlertsCountPanel {...defaultProps} />
        </TestProviders>
      );
      expect(
        (VisualizationEmbeddable as unknown as jest.Mock).mock.calls[0][0].extraActions[0].id
      ).toEqual('resetGroupByFields');
    });
  });

  it('should render with extra options', async () => {
    await act(async () => {
      mount(
        <TestProviders>
          <AlertsCountPanel {...defaultProps} />
        </TestProviders>
      );
      expect(
        (VisualizationEmbeddable as unknown as jest.Mock).mock.calls[0][0].extraOptions
          .breakdownField
      ).toEqual(defaultProps.stackByField1);
    });
  });
});
