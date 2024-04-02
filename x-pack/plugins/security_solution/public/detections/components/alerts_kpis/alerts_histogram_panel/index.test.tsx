/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { mount } from 'enzyme';
import type { Filter } from '@kbn/es-query';

import { SecurityPageName } from '../../../../app/types';
import { CHART_SETTINGS_POPOVER_ARIA_LABEL } from '../../../../common/components/chart_settings_popover/translations';
import { DEFAULT_WIDTH } from '../../../../common/components/charts/draggable_legend';
import { MatrixLoader } from '../../../../common/components/matrix_histogram/matrix_loader';
import { DEFAULT_STACK_BY_FIELD, DEFAULT_STACK_BY_FIELD1 } from '../common/config';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { TestProviders } from '../../../../common/mock';
import * as helpers from './helpers';
import { mockAlertSearchResponse } from './mock_data';
import { ChartContextMenu } from '../../../pages/detection_engine/chart_panels/chart_context_menu';
import { AlertsHistogramPanel, LEGEND_WITH_COUNTS_WIDTH } from '.';
import { LensEmbeddable } from '../../../../common/components/visualization_actions/lens_embeddable';
import type { ExperimentalFeatures } from '../../../../../common';
import { allowedExperimentalValues } from '../../../../../common';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

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

jest.mock('../../../../common/components/navigation/use_url_state_query_params');

const defaultUseQueryAlertsReturn = {
  loading: true,
  setQuery: () => undefined,
  data: null,
  response: '',
  request: '',
  refetch: null,
};
const mockUseQueryAlerts = jest.fn().mockReturnValue(defaultUseQueryAlertsReturn);

jest.mock('../../../containers/detection_engine/alerts/use_query', () => {
  const original = jest.requireActual('../../../containers/detection_engine/alerts/use_query');
  return {
    ...original,
    useQueryAlerts: (...props: unknown[]) => mockUseQueryAlerts(...props),
  };
});
jest.mock('../../../../common/hooks/use_experimental_features');
jest.mock('../../../../common/components/page/use_refetch_by_session');
jest.mock('../../../../common/components/visualization_actions/lens_embeddable');

jest.mock('../../../../common/components/page/use_refetch_by_session');
jest.mock('../common/hooks', () => {
  const actual = jest.requireActual('../common/hooks');
  return {
    ...actual,
    useInspectButton: jest.fn(),
  };
});

const mockUseIsExperimentalFeatureEnabled = jest.fn((feature: keyof ExperimentalFeatures) => {
  if (feature === 'alertsPageChartsEnabled') return false;
  if (feature === 'chartEmbeddablesEnabled') return false;
  return allowedExperimentalValues[feature];
});

jest.mock('../../../../common/hooks/use_experimental_features');
jest.mock('../../../hooks/alerts_visualization/use_alert_histogram_count', () => ({
  useAlertHistogramCount: jest.fn().mockReturnValue(999),
}));

const defaultProps = {
  setQuery: jest.fn(),
  showBuildingBlockAlerts: false,
  showOnlyThreatIndicatorAlerts: false,
  showTotalAlertsCount: true,
  signalIndexName: 'signalIndexName',
  updateDateRange: jest.fn(),
};
const mockSetToggle = jest.fn();
const mockUseQueryToggle = useQueryToggle as jest.Mock;

describe('AlertsHistogramPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: mockSetToggle });

    (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(
      mockUseIsExperimentalFeatureEnabled
    );
  });

  it('renders correctly', () => {
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
      mockUseQueryAlerts.mockReturnValue({
        loading: false,
        data: mockAlertSearchResponse,
        setQuery: () => {},
        response: '',
        request: '',
        refetch: () => {},
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

    test('it renders counts in the legend when `showCountsInLegend` is true', () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} showCountsInLegend={true} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="legendItemCount"]').exists()).toBe(true);
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

  describe('inspect button', () => {
    test('it renders the inspect button by default', () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="inspect-icon-button"]').first().exists()).toBe(true);
    });

    test('it does NOT render the inspect button when a `chartOptionsContextMenu` is provided', async () => {
      const chartOptionsContextMenu = (queryId: string) => (
        <ChartContextMenu
          defaultStackByField={DEFAULT_STACK_BY_FIELD}
          defaultStackByField1={DEFAULT_STACK_BY_FIELD1}
          queryId={queryId}
          setStackBy={jest.fn()}
          setStackByField1={jest.fn()}
        />
      );

      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel
            {...defaultProps}
            chartOptionsContextMenu={chartOptionsContextMenu}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="inspect-icon-button"]').first().exists()).toBe(false);
    });
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

    mockUseQueryAlerts.mockReturnValue({
      loading: false,
      data: mockAlertSearchResponse,
      setQuery: () => {},
      response: '',
      request: '',
      refetch: () => {},
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

      expect(wrapper.find('label.euiFormControlLayout__prepend').first().text()).toEqual(
        'Stack by'
      );
    });

    test('it prepends a custom stack by label when `stackByLabel` is provided', () => {
      const stackByLabel = 'Group by';

      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} stackByLabel={stackByLabel} />
        </TestProviders>
      );

      expect(wrapper.find('label.euiFormControlLayout__prepend').first().text()).toEqual(
        stackByLabel
      );
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

  test('it renders the chart options context menu when a `chartOptionsContextMenu` is provided', async () => {
    const chartOptionsContextMenu = (queryId: string) => (
      <ChartContextMenu
        defaultStackByField={DEFAULT_STACK_BY_FIELD}
        defaultStackByField1={DEFAULT_STACK_BY_FIELD1}
        queryId={queryId}
        setStackBy={jest.fn()}
        setStackByField1={jest.fn()}
      />
    );

    render(
      <TestProviders>
        <AlertsHistogramPanel {...defaultProps} chartOptionsContextMenu={chartOptionsContextMenu} />
      </TestProviders>
    );

    expect(
      screen.getByRole('button', { name: CHART_SETTINGS_POPOVER_ARIA_LABEL })
    ).toBeInTheDocument();
  });

  describe('legend width', () => {
    beforeEach(() => {
      mockUseQueryAlerts.mockReturnValue({
        loading: false,
        data: mockAlertSearchResponse,
        setQuery: () => {},
        response: '',
        request: '',
        refetch: () => {},
      });
    });

    test('it renders the legend with the expected default min-width', () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="draggable-legend"]').first()).toHaveStyleRule(
        'min-width',
        `${DEFAULT_WIDTH}px`
      );
    });

    test('it renders the legend with the expected min-width when `showCountsInLegend` is true', () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} showCountsInLegend={true} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="draggable-legend"]').first()).toHaveStyleRule(
        'min-width',
        `${LEGEND_WITH_COUNTS_WIDTH}px`
      );
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
    it('it render with a illegal KQL', async () => {
      await act(async () => {
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

        await waitFor(() => {
          expect(wrapper.find('[data-test-subj="alerts-histogram-panel"]').exists()).toBeTruthy();
        });
        wrapper.unmount();
      });
    });
  });

  describe('CombinedQueries', () => {
    it('combinedQueries props is valid, alerts query include combinedQueries', async () => {
      const mockGetAlertsHistogramQuery = jest.spyOn(helpers, 'getAlertsHistogramQuery');

      const props = {
        ...defaultProps,
        query: { query: 'host.name: "', language: 'kql' },
        combinedQueries:
          '{"bool":{"must":[],"filter":[{"match_all":{}},{"exists":{"field":"process.name"}}],"should":[],"must_not":[]}}',
      };
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...props} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(mockGetAlertsHistogramQuery.mock.calls[0]).toEqual([
          'kibana.alert.rule.name',
          '2020-07-07T08:20:18.966Z',
          '2020-07-08T08:20:18.966Z',
          [
            {
              bool: {
                filter: [{ match_all: {} }, { exists: { field: 'process.name' } }],
                must: [],
                must_not: [],
                should: [],
              },
            },
          ],
          undefined,
        ]);
      });
      wrapper.unmount();
    });
  });

  describe('Filters', () => {
    it('filters props is valid, alerts query include filter', async () => {
      const mockGetAlertsHistogramQuery = jest.spyOn(helpers, 'getAlertsHistogramQuery');
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
        query: { query: '', language: 'kql' },
        filters: [statusFilter],
      };
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...props} />
        </TestProviders>
      );

      await waitFor(() => {
        expect(mockGetAlertsHistogramQuery.mock.calls[1]).toEqual([
          'kibana.alert.rule.name',
          '2020-07-07T08:20:18.966Z',
          '2020-07-08T08:20:18.966Z',
          [
            {
              bool: {
                filter: [{ term: { 'kibana.alert.workflow_status': 'open' } }],
                must: [],
                must_not: [],
                should: [],
              },
            },
          ],
          undefined,
        ]);
      });
      wrapper.unmount();
    });
  });

  describe('parseCombinedQueries', () => {
    it('return empty object when variables is undefined', async () => {
      expect(helpers.parseCombinedQueries(undefined)).toEqual({});
    });

    it('return empty object when variables is empty string', async () => {
      expect(helpers.parseCombinedQueries('')).toEqual({});
    });

    it('return empty object when variables is NOT a valid stringify json object', async () => {
      expect(helpers.parseCombinedQueries('hello world')).toEqual({});
    });

    it('return a valid json object when variables is a valid json stringify', async () => {
      expect(
        helpers.parseCombinedQueries(
          '{"bool":{"must":[],"filter":[{"match_all":{}},{"exists":{"field":"process.name"}}],"should":[],"must_not":[]}}'
        )
      ).toMatchInlineSnapshot(`
          Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "match_all": Object {},
                },
                Object {
                  "exists": Object {
                    "field": "process.name",
                  },
                },
              ],
              "must": Array [],
              "must_not": Array [],
              "should": Array [],
            },
          }
      `);
    });
  });

  describe('buildCombinedQueries', () => {
    it('return empty array when variables is undefined', async () => {
      expect(helpers.buildCombinedQueries(undefined)).toEqual([]);
    });

    it('return empty array when variables is empty string', async () => {
      expect(helpers.buildCombinedQueries('')).toEqual([]);
    });

    it('return array with empty object when variables is NOT a valid stringify json object', async () => {
      expect(helpers.buildCombinedQueries('hello world')).toEqual([{}]);
    });

    it('return a valid json object when variables is a valid json stringify', async () => {
      expect(
        helpers.buildCombinedQueries(
          '{"bool":{"must":[],"filter":[{"match_all":{}},{"exists":{"field":"process.name"}}],"should":[],"must_not":[]}}'
        )
      ).toMatchInlineSnapshot(`
        Array [
          Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "match_all": Object {},
                },
                Object {
                  "exists": Object {
                    "field": "process.name",
                  },
                },
              ],
              "must": Array [],
              "must_not": Array [],
              "should": Array [],
            },
          },
        ]
      `);
    });
  });

  describe('toggleQuery', () => {
    it('toggles', async () => {
      await act(async () => {
        const wrapper = mount(
          <TestProviders>
            <AlertsHistogramPanel {...defaultProps} />
          </TestProviders>
        );
        wrapper.find('[data-test-subj="query-toggle-header"]').first().simulate('click');
        expect(mockSetToggle).toBeCalledWith(false);
      });
    });

    describe('when alertsPageChartsEnabled = false', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        mockUseIsExperimentalFeatureEnabled.mockReturnValueOnce(false); // for chartEmbeddablesEnabled flag
        mockUseIsExperimentalFeatureEnabled.mockReturnValueOnce(false); // for alertsPageChartsEnabled flag
      });

      it('toggleStatus=true, render', async () => {
        await act(async () => {
          const wrapper = mount(
            <TestProviders>
              <AlertsHistogramPanel {...defaultProps} />
            </TestProviders>
          );

          expect(wrapper.find(MatrixLoader).exists()).toEqual(true);
        });
      });
      it('toggleStatus=false, hide', async () => {
        mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
        await act(async () => {
          const wrapper = mount(
            <TestProviders>
              <AlertsHistogramPanel {...defaultProps} />
            </TestProviders>
          );
          expect(wrapper.find(MatrixLoader).exists()).toEqual(false);
        });
      });
    });

    describe('when alertsPageChartsEnabled = true', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        mockUseIsExperimentalFeatureEnabled.mockReturnValueOnce(false); // for chartEmbeddablesEnabled flag
        mockUseIsExperimentalFeatureEnabled.mockReturnValueOnce(true); // for alertsPageChartsEnabled flag
      });

      it('isExpanded=true, render', async () => {
        await act(async () => {
          const wrapper = mount(
            <TestProviders>
              <AlertsHistogramPanel {...defaultProps} isExpanded={true} />
            </TestProviders>
          );
          expect(wrapper.find(MatrixLoader).exists()).toEqual(true);
        });
      });
      it('isExpanded=false, hide', async () => {
        await act(async () => {
          const wrapper = mount(
            <TestProviders>
              <AlertsHistogramPanel {...defaultProps} isExpanded={false} />
            </TestProviders>
          );
          expect(wrapper.find(MatrixLoader).exists()).toEqual(false);
        });
      });
      it('isExpanded is not passed in and toggleStatus =true, render', async () => {
        await act(async () => {
          const wrapper = mount(
            <TestProviders>
              <AlertsHistogramPanel {...defaultProps} />
            </TestProviders>
          );
          expect(wrapper.find(MatrixLoader).exists()).toEqual(true);
        });
      });
      it('isExpanded is not passed in and toggleStatus =false, hide', async () => {
        mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
        await act(async () => {
          const wrapper = mount(
            <TestProviders>
              <AlertsHistogramPanel {...defaultProps} />
            </TestProviders>
          );
          expect(wrapper.find(MatrixLoader).exists()).toEqual(false);
        });
      });
    });
  });

  describe('when isChartEmbeddablesEnabled = true', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: mockSetToggle });
      mockUseIsExperimentalFeatureEnabled.mockReturnValueOnce(true); // for chartEmbeddablesEnabled flag
      mockUseIsExperimentalFeatureEnabled.mockReturnValueOnce(false); // for alertsPageChartsEnabled flag
    });

    test('it renders the header with alerts count', () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsHistogramPanel {...defaultProps} alignHeader="flexEnd" />
        </TestProviders>
      );

      mockUseQueryAlerts.mockReturnValue({
        loading: false,
        setQuery: () => undefined,
        data: null,
        response: '',
        request: '',
        refetch: null,
      });
      wrapper.setProps({ filters: [] });
      wrapper.update();

      expect(wrapper.find(`[data-test-subj="header-section-subtitle"]`).text()).toContain('999');
    });

    it('renders LensEmbeddable', async () => {
      await act(async () => {
        const wrapper = mount(
          <TestProviders>
            <AlertsHistogramPanel {...defaultProps} />
          </TestProviders>
        );
        expect(
          wrapper.find('[data-test-subj="embeddable-matrix-histogram"]').exists()
        ).toBeTruthy();
      });
    });

    it('renders LensEmbeddable with provided height', async () => {
      await act(async () => {
        mount(
          <TestProviders>
            <AlertsHistogramPanel {...defaultProps} />
          </TestProviders>
        );
        expect((LensEmbeddable as unknown as jest.Mock).mock.calls[0][0].height).toEqual(155);
      });
    });

    it('should skip calling getAlertsRiskQuery', async () => {
      await act(async () => {
        mount(
          <TestProviders>
            <AlertsHistogramPanel {...defaultProps} />
          </TestProviders>
        );
        expect(mockUseQueryAlerts.mock.calls[0][0].skip).toBeTruthy();
      });
    });
  });
});
