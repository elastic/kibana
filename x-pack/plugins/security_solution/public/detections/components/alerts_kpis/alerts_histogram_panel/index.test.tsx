/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { mount } from 'enzyme';
import type { Filter } from '@kbn/es-query';

import { SecurityPageName } from '../../../../app/types';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { TestProviders } from '../../../../common/mock';
import { mockAlertSearchResponse } from './mock_data';
import { VisualizationEmbeddable } from '../../../../common/components/visualization_actions/visualization_embeddable';

import { AlertsHistogramPanel } from '.';
import { useVisualizationResponse } from '../../../../common/components/visualization_actions/use_visualization_response';

jest.mock('../../../../common/containers/query_toggle');

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');
  return {
    ...originalModule,
    createHref: jest.fn(),
    useHistory: jest.fn(),
    useLocation: jest.fn().mockReturnValue({ pathname: '' }),
  };
});

const mockNavigateToApp = jest.fn();
jest.mock('../../../../common/lib/kibana/kibana_react', () => {
  const original = jest.requireActual('../../../../common/lib/kibana/kibana_react');

  return {
    ...original,
    useKibana: () => ({
      services: {
        application: {
          navigateToApp: mockNavigateToApp,
          getUrlForApp: jest.fn(),
        },
        data: {
          search: {
            search: jest.fn(),
          },
        },
        uiSettings: {
          get: jest.fn(),
        },
        notifications: {
          toasts: {
            addWarning: jest.fn(),
            addError: jest.fn(),
            addSuccess: jest.fn(),
            remove: jest.fn(),
          },
        },
      },
    }),
  };
});

jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...original,
    useUiSetting$: jest.fn().mockReturnValue([]),
    useGetUserSavedObjectPermissions: jest.fn(),
  };
});

jest.mock('../../../../common/components/visualization_actions/visualization_embeddable');

jest.mock('../../../../common/components/visualization_actions/use_visualization_response', () => {
  const original = jest.requireActual(
    '../../../../common/components/visualization_actions/use_visualization_response'
  );
  return {
    ...original,
    useVisualizationResponse: jest.fn().mockReturnValue({ loading: false }),
  };
});

jest.mock('../common/hooks', () => {
  const actual = jest.requireActual('../common/hooks');
  return {
    ...actual,
    useInspectButton: jest.fn(),
  };
});

jest.mock('../../../hooks/alerts_visualization/use_alert_histogram_count', () => ({
  useAlertHistogramCount: jest.fn().mockReturnValue(999),
}));

jest.mock('../../../../common/components/visualization_actions/use_visualization_response', () => ({
  useVisualizationResponse: jest.fn().mockReturnValue({
    responses: [
      {
        hits: { total: 0 },
        aggregations: { myAgg: { buckets: [{ key: 'A' }, { key: 'B' }, { key: 'C' }] } },
      },
    ],
    loading: false,
  }),
}));

const mockSetIsExpanded = jest.fn();
const defaultProps = {
  setQuery: jest.fn(),
  showBuildingBlockAlerts: false,
  showOnlyThreatIndicatorAlerts: false,
  showTotalAlertsCount: true,
  signalIndexName: 'signalIndexName',
  updateDateRange: jest.fn(),
  isExpanded: true,
  setIsExpanded: mockSetIsExpanded,
};
const mockSetToggle = jest.fn();
const mockUseQueryToggle = useQueryToggle as jest.Mock;
const mockUseVisualizationResponse = useVisualizationResponse as jest.Mock;

describe('AlertsHistogramPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: mockSetToggle });
  });

  test('renders correctly', () => {
    const wrapper = mount(
      <TestProviders>
        <AlertsHistogramPanel {...defaultProps} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="alerts-histogram-panel"]').exists()).toBeTruthy();
    wrapper.unmount();
  });

  describe('legend counts', () => {
    beforeEach(() => {
      mockUseVisualizationResponse.mockReturnValue({
        loading: false,
        responses: mockAlertSearchResponse,
      });
    });

    test('it does NOT render counts in the legend by default', () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="legendItemCount"]').exists()).toBe(false);
    });
  });

  test('it renders the header with the specified `alignHeader` alignment', () => {
    const wrapper = mount(
      <TestProviders>
        <AlertsHistogramPanel {...defaultProps} alignHeader="flexEnd" />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="headerSectionInnerFlexGroup"]').last().getDOMNode().className
    ).toContain('flexEnd');
  });

  test('it aligns the panel flex group at flex start to ensure the context menu is displayed at the top of the panel', () => {
    const wrapper = mount(
      <TestProviders>
        <AlertsHistogramPanel {...defaultProps} />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="panelFlexGroup"]').last().getDOMNode().className
    ).toContain('flexStart');
  });

  test('it invokes onFieldSelected when a field is selected', async () => {
    const onFieldSelected = jest.fn();
    const optionToSelect = 'agent.hostname';

    mockUseVisualizationResponse.mockReturnValue({
      loading: false,
      responses: mockAlertSearchResponse,
    });

    render(
      <TestProviders>
        <AlertsHistogramPanel {...defaultProps} onFieldSelected={onFieldSelected} />
      </TestProviders>
    );

    const comboBox = screen.getByTestId('comboBoxSearchInput');
    comboBox.focus(); // display the combo box options

    const option = await screen.findByText(optionToSelect);
    fireEvent.click(option);

    expect(onFieldSelected).toBeCalledWith(optionToSelect);
  });

  describe('stackByLabel', () => {
    test('it renders the default stack by label when `stackByLabel` is NOT provided', () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} />
        </TestProviders>
      );

      expect(wrapper.find('.euiFormControlLayout__prepend').first().text()).toEqual('Stack by');
    });

    test('it prepends a custom stack by label when `stackByLabel` is provided', () => {
      const stackByLabel = 'Group by';

      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} stackByLabel={stackByLabel} />
        </TestProviders>
      );

      expect(wrapper.find('.euiFormControlLayout__prepend').first().text()).toEqual(stackByLabel);
    });
  });

  describe('stackByWidth', () => {
    test('it renders the first StackByComboBox with the specified `stackByWidth`', () => {
      const stackByWidth = 1234;

      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} stackByWidth={stackByWidth} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="stackByComboBox"]').first()).toHaveStyleRule(
        'width',
        `${stackByWidth}px`
      );
    });

    test('it renders the placeholder StackByComboBox with the specified `stackByWidth`', () => {
      const stackByWidth = 1234;

      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel
            {...defaultProps}
            showGroupByPlaceholder={true}
            stackByWidth={stackByWidth}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="stackByPlaceholder"]').first()).toHaveStyleRule(
        'width',
        `${stackByWidth}px`
      );
    });
  });

  describe('placeholder spacer', () => {
    test('it does NOT render the group by placeholder spacer by default', () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} />
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="placeholderSpacer"]').exists()).toBe(false);
    });

    test('it renders the placeholder spacer when `showGroupByPlaceholder` is true', () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} showGroupByPlaceholder={true} />
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="placeholderSpacer"]').exists()).toBe(true);
    });
  });

  describe('placeholder tooltip', () => {
    test('it does NOT render the placeholder tooltip by default', () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} />
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="placeholderTooltip"]').exists()).toBe(false);
    });

    test('it renders the placeholder tooltip when `showGroupByPlaceholder` is true', () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} showGroupByPlaceholder={true} />
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="placeholderTooltip"]').exists()).toBe(true);
    });
  });

  describe('placeholder', () => {
    test('it does NOT render the group by placeholder by default', () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} />
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="stackByPlaceholder"]').exists()).toBe(false);
    });

    test('it renders the placeholder when `showGroupByPlaceholder` is true', () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} showGroupByPlaceholder={true} />
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="stackByPlaceholder"]').exists()).toBe(true);
    });
  });

  describe('Button view alerts', () => {
    it('renders correctly', () => {
      const props = { ...defaultProps, showLinkToAlerts: true };
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...props} />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="alerts-histogram-panel-go-to-alerts-page"]').exists()
      ).toBeTruthy();
      wrapper.unmount();
    });

    it('when click we call navigateToApp to make sure to navigate to right page', () => {
      const props = { ...defaultProps, showLinkToAlerts: true };
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...props} />
        </TestProviders>
      );

      wrapper
        .find('button[data-test-subj="alerts-histogram-panel-go-to-alerts-page"]')
        .simulate('click', {
          preventDefault: jest.fn(),
        });

      expect(mockNavigateToApp).toBeCalledWith('securitySolutionUI', {
        deepLinkId: SecurityPageName.alerts,
        path: '',
      });
      wrapper.unmount();
    });
  });

  describe('Query', () => {
    it('it render with a illegal KQL', () => {
      jest.mock('@kbn/es-query', () => ({
        buildEsQuery: jest.fn().mockImplementation(() => {
          throw new Error('Something went wrong');
        }),
      }));
      const props = { ...defaultProps, query: { query: 'host.name: "', language: 'kql' } };
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...props} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="alerts-histogram-panel"]').exists()).toBeTruthy();
      wrapper.unmount();
    });
  });

  describe('Filters', () => {
    it('filters props is valid, alerts query include filter', () => {
      const statusFilter: Filter = {
        meta: {
          alias: null,
          disabled: false,
          key: 'kibana.alert.workflow_status',
          negate: false,
          params: {
            query: 'open',
          },
          type: 'phrase',
        },
        query: {
          term: {
            'kibana.alert.workflow_status': 'open',
          },
        },
      };

      const props = {
        ...defaultProps,
        filters: [statusFilter],
      };
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...props} />
        </TestProviders>
      );

      expect((VisualizationEmbeddable as unknown as jest.Mock).mock.calls[0][0].timerange).toEqual({
        from: '2020-07-07T08:20:18.966Z',
        to: '2020-07-08T08:20:18.966Z',
      });
      expect(
        (VisualizationEmbeddable as unknown as jest.Mock).mock.calls[0][0].extraOptions.filters
      ).toEqual(props.filters);
      wrapper.unmount();
    });
  });

  describe('toggle button', () => {
    describe('When setIsExpanded is available', () => {
      it('toggles', () => {
        const wrapper = mount(
          <TestProviders>
            <AlertsHistogramPanel {...defaultProps} />
          </TestProviders>
        );

        wrapper.find('[data-test-subj="query-toggle-header"]').first().simulate('click');
        expect(mockSetIsExpanded).toBeCalledWith(false);
        expect(mockSetToggle).not.toBeCalled();
        wrapper.unmount();
      });

      it('when isExpanded is true, render histogram panel', async () => {
        const wrapper = mount(
          <TestProviders>
            <AlertsHistogramPanel {...defaultProps} isExpanded={true} />
          </TestProviders>
        );
        expect(wrapper.find('[data-test-subj="panelFlexGroup"]').exists()).toEqual(true);
        expect(wrapper.find('[data-test-subj="embeddable-matrix-histogram"]').exists()).toEqual(
          true
        );
        wrapper.unmount();
      });

      it('when isExpanded is false, hide histogram panel', async () => {
        const wrapper = mount(
          <TestProviders>
            <AlertsHistogramPanel {...defaultProps} isExpanded={false} />
          </TestProviders>
        );
        expect(wrapper.find('[data-test-subj="panelFlexGroup"]').exists()).toEqual(false);
        expect(wrapper.find('[data-test-subj="embeddable-matrix-histogram"]').exists()).toEqual(
          false
        );
        wrapper.unmount();
      });
    });

    describe('When setIsExpanded is not available, use toggleQuery', () => {
      const props = { ...defaultProps, setIsExpanded: undefined };

      it('toggles', async () => {
        const wrapper = mount(
          <TestProviders>
            <AlertsHistogramPanel {...props} />
          </TestProviders>
        );
        wrapper.find('[data-test-subj="query-toggle-header"]').first().simulate('click');
        expect(mockSetToggle).toBeCalledWith(false);
        wrapper.unmount();
      });

      it('when toggleStatus is true, render', () => {
        const wrapper = mount(
          <TestProviders>
            <AlertsHistogramPanel {...props} />
          </TestProviders>
        );
        expect(wrapper.find('[data-test-subj="panelFlexGroup"]').exists()).toEqual(true);
        expect(wrapper.find('[data-test-subj="embeddable-matrix-histogram"]').exists()).toEqual(
          true
        );
        wrapper.unmount();
      });

      it('when toggleStatus is false, hide', async () => {
        mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
        const wrapper = mount(
          <TestProviders>
            <AlertsHistogramPanel {...props} />
          </TestProviders>
        );
        expect(wrapper.find('[data-test-subj="panelFlexGroup"]').exists()).toEqual(false);
        expect(wrapper.find('[data-test-subj="embeddable-matrix-histogram"]').exists()).toEqual(
          false
        );
        wrapper.unmount();
      });
    });
  });

  describe('VisualizationEmbeddable', () => {
    test('it renders the header with alerts count', () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} alignHeader="flexEnd" />
        </TestProviders>
      );

      mockUseVisualizationResponse.mockReturnValue({
        loading: false,
        responses: [
          {
            hits: { total: 0 },
            aggregations: { myAgg: { buckets: [{ key: 'A' }, { key: 'B' }, { key: 'C' }] } },
          },
        ],
      });

      wrapper.setProps({ filters: [] });
      wrapper.update();

      expect(wrapper.find(`[data-test-subj="header-section-subtitle"]`).text()).toContain('999');
      wrapper.unmount();
    });

    it('renders LensEmbeddable', () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} />
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="embeddable-matrix-histogram"]').exists()).toBeTruthy();
      wrapper.unmount();
    });

    it('renders LensEmbeddable with provided height', () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} />
        </TestProviders>
      );

      expect((VisualizationEmbeddable as unknown as jest.Mock).mock.calls[0][0].height).toEqual(
        155
      );
      wrapper.unmount();
    });

    it('should render correct subtitle with alert count', () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} />
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="header-section-subtitle"]`).text()).toContain('999');
      wrapper.unmount();
    });

    it('should render correct subtitle with empty string', () => {
      (useVisualizationResponse as jest.Mock).mockReturnValue({
        responses: [
          {
            hits: { total: 0 },
            aggregations: { myAgg: { buckets: [] } },
          },
        ],
        loading: false,
      });
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} />
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="header-section-subtitle"]`).text()).toEqual('');
      wrapper.unmount();
    });
  });
});
