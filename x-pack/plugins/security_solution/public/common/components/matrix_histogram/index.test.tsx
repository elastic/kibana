/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import React from 'react';

import { MatrixHistogram } from '.';
import { useMatrixHistogramCombined } from '../../containers/matrix_histogram';
import { MatrixHistogramType } from '../../../../common/search_strategy/security_solution';
import { TestProviders } from '../../mock';
import { mockRuntimeMappings } from '../../containers/source/mock';
import { getDnsTopDomainsLensAttributes } from '../visualization_actions/lens_attributes/network/dns_top_domains';
import { useQueryToggle } from '../../containers/query_toggle';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import { allowedExperimentalValues } from '../../../../common/experimental_features';
import { VisualizationActions } from '../visualization_actions/actions';

jest.mock('../../containers/query_toggle');

jest.mock('./matrix_loader', () => ({
  MatrixLoader: () => <div className="matrixLoader" />,
}));

jest.mock('../charts/barchart', () => ({
  BarChart: () => <div className="barchart" />,
}));

jest.mock('../../containers/matrix_histogram');

jest.mock('../visualization_actions/actions');
jest.mock('../visualization_actions/visualization_embeddable');

jest.mock('../../hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

jest.mock('./utils', () => ({
  getBarchartConfigs: jest.fn(),
  getCustomChartData: jest.fn().mockReturnValue(true),
}));

const mockUseVisualizationResponse = jest.fn(() => ({
  responses: [{ aggregations: [{ buckets: [{ key: '1234' }] }], hits: { total: 999 } }],
}));
jest.mock('../visualization_actions/use_visualization_response', () => ({
  useVisualizationResponse: () => mockUseVisualizationResponse(),
}));

const mockLocation = jest.fn().mockReturnValue({ pathname: '/test' });
const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.Mock;

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useLocation: () => mockLocation(),
  };
});

describe('Matrix Histogram Component', () => {
  let wrapper: ReactWrapper;

  const mockMatrixOverTimeHistogramProps = {
    defaultIndex: ['defaultIndex'],
    defaultStackByOption: {
      text: 'dns.question.registered_domain',
      value: 'dns.question.registered_domain',
    },
    endDate: '2019-07-18T20:00:00.000Z',
    errorMessage: 'error',
    histogramType: MatrixHistogramType.alerts,
    id: 'mockId',
    indexNames: [],
    isInspected: false,
    isPtrIncluded: true,
    setQuery: jest.fn(),
    skip: false,
    sourceId: 'default',
    stackByOptions: [
      { text: 'dns.question.registered_domain', value: 'dns.question.registered_domain' },
    ],
    startDate: '2019-07-18T19:00: 00.000Z',
    subtitle: jest.fn((totalCount) => `Showing: ${totalCount} events`),
    totalCount: -1,
    title: 'mockTitle',
    runtimeMappings: mockRuntimeMappings,
  };
  const mockUseMatrix = useMatrixHistogramCombined as jest.Mock;
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  const mockSetToggle = jest.fn();
  const getMockUseIsExperimentalFeatureEnabled =
    (mockMapping?: Partial<ExperimentalFeatures>) =>
    (flag: keyof typeof allowedExperimentalValues) =>
      mockMapping ? mockMapping?.[flag] : allowedExperimentalValues?.[flag];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsExperimentalFeatureEnabled.mockImplementation(
      getMockUseIsExperimentalFeatureEnabled({ chartEmbeddablesEnabled: false })
    );
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: mockSetToggle });
    mockUseMatrix.mockReturnValue([
      false,
      {
        data: null,
        inspect: false,
        totalCount: null,
      },
    ]);
  });

  describe('on initial load', () => {
    beforeEach(() => {
      wrapper = mount(<MatrixHistogram {...mockMatrixOverTimeHistogramProps} />, {
        wrappingComponent: TestProviders,
      });
    });
    test('it requests Matrix Histogram', () => {
      expect(mockUseMatrix).toHaveBeenCalledWith({
        endDate: mockMatrixOverTimeHistogramProps.endDate,
        errorMessage: mockMatrixOverTimeHistogramProps.errorMessage,
        histogramType: mockMatrixOverTimeHistogramProps.histogramType,
        indexNames: mockMatrixOverTimeHistogramProps.indexNames,
        startDate: mockMatrixOverTimeHistogramProps.startDate,
        stackByField: mockMatrixOverTimeHistogramProps.defaultStackByOption.value,
        runtimeMappings: mockMatrixOverTimeHistogramProps.runtimeMappings,
        isPtrIncluded: mockMatrixOverTimeHistogramProps.isPtrIncluded,
        skip: mockMatrixOverTimeHistogramProps.skip,
      });
    });
    test('it renders MatrixLoader', () => {
      expect(wrapper.find('MatrixLoader').exists()).toBe(true);
    });
  });

  describe('spacer', () => {
    test('it renders a spacer by default', () => {
      wrapper = mount(<MatrixHistogram {...mockMatrixOverTimeHistogramProps} />, {
        wrappingComponent: TestProviders,
      });
      expect(wrapper.find('[data-test-subj="spacer"]').exists()).toBe(true);
    });

    test('it does NOT render a spacer when showSpacer is false', () => {
      wrapper = mount(
        <MatrixHistogram {...mockMatrixOverTimeHistogramProps} showSpacer={false} />,
        {
          wrappingComponent: TestProviders,
        }
      );
      expect(wrapper.find('[data-test-subj="spacer"]').exists()).toBe(false);
    });
  });

  describe('not initial load', () => {
    beforeEach(() => {
      wrapper = mount(<MatrixHistogram {...mockMatrixOverTimeHistogramProps} />, {
        wrappingComponent: TestProviders,
      });
      mockUseMatrix.mockReturnValue([
        false,
        {
          data: [
            { x: 1, y: 2, g: 'g1' },
            { x: 2, y: 4, g: 'g1' },
            { x: 3, y: 6, g: 'g1' },
            { x: 1, y: 1, g: 'g2' },
            { x: 2, y: 3, g: 'g2' },
            { x: 3, y: 5, g: 'g2' },
          ],
          inspect: false,
          totalCount: 1,
        },
      ]);
      wrapper.setProps({ endDate: 100 });
      wrapper.update();
    });
    test('it renders no MatrixLoader', () => {
      expect(wrapper.find(`MatrixLoader`).exists()).toBe(false);
    });

    test('it shows BarChart if data available', () => {
      expect(wrapper.find(`.barchart`).exists()).toBe(true);
    });
  });

  describe('select dropdown', () => {
    test('should be hidden if only one option is provided', () => {
      wrapper = mount(<MatrixHistogram {...mockMatrixOverTimeHistogramProps} />, {
        wrappingComponent: TestProviders,
      });
      expect(wrapper.find('EuiSelect').exists()).toBe(false);
    });
  });

  describe('Inspect button', () => {
    test("it doesn't render Inspect button by default", () => {
      const testProps = {
        ...mockMatrixOverTimeHistogramProps,
        getLensAttributes: getDnsTopDomainsLensAttributes,
      };
      wrapper = mount(<MatrixHistogram {...testProps} />, {
        wrappingComponent: TestProviders,
      });
      expect(wrapper.find('[data-test-subj="inspect-icon-button"]').exists()).toBe(false);
    });
  });

  describe('VisualizationActions', () => {
    const testProps = {
      ...mockMatrixOverTimeHistogramProps,
      getLensAttributes: jest.fn().mockReturnValue(getDnsTopDomainsLensAttributes()),
    };
    beforeEach(() => {
      wrapper = mount(<MatrixHistogram {...testProps} />, {
        wrappingComponent: TestProviders,
      });
    });
    test('it renders VisualizationActions if getLensAttributes is provided', () => {
      expect(wrapper.find('[data-test-subj="visualizationActions"]').exists()).toBe(true);
      expect(wrapper.find('[data-test-subj="visualizationActions"]').prop('className')).toEqual(
        'histogram-viz-actions'
      );
    });

    test('it VisualizationActions with correct properties', () => {
      expect((VisualizationActions as unknown as jest.Mock).mock.calls[0][0]).toEqual(
        expect.objectContaining({
          className: 'histogram-viz-actions',
          extraOptions: {
            dnsIsPtrIncluded: testProps.isPtrIncluded,
          },
          getLensAttributes: testProps.getLensAttributes,
          lensAttributes: undefined,
          isInspectButtonDisabled: true,
          queryId: testProps.id,
          stackByField: testProps.defaultStackByOption.value,
          timerange: {
            from: testProps.startDate,
            to: testProps.endDate,
          },
          title: testProps.title,
        })
      );
    });
  });

  describe('toggle query', () => {
    const testProps = {
      ...mockMatrixOverTimeHistogramProps,
      getLensAttributes: getDnsTopDomainsLensAttributes,
    };

    test('toggleQuery updates toggleStatus', () => {
      wrapper = mount(<MatrixHistogram {...testProps} />, {
        wrappingComponent: TestProviders,
      });
      expect(mockUseMatrix.mock.calls[0][0].skip).toEqual(false);
      wrapper.find('[data-test-subj="query-toggle-header"]').first().simulate('click');
      expect(mockSetToggle).toBeCalledWith(false);
      expect(mockUseMatrix.mock.calls[1][0].skip).toEqual(true);
    });

    test('toggleStatus=true, do not skip', () => {
      wrapper = mount(<MatrixHistogram {...testProps} />, {
        wrappingComponent: TestProviders,
      });

      expect(mockUseMatrix.mock.calls[0][0].skip).toEqual(false);
    });

    test('toggleStatus=true, render components', () => {
      wrapper = mount(<MatrixHistogram {...testProps} />, {
        wrappingComponent: TestProviders,
      });
      expect(wrapper.find('MatrixLoader').exists()).toBe(true);
    });

    test('toggleStatus=false, do not render components', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
      wrapper = mount(<MatrixHistogram {...testProps} />, {
        wrappingComponent: TestProviders,
      });
      expect(wrapper.find('MatrixLoader').exists()).toBe(false);
    });

    test('toggleStatus=false, skip', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
      wrapper = mount(<MatrixHistogram {...testProps} />, {
        wrappingComponent: TestProviders,
      });

      expect(mockUseMatrix.mock.calls[0][0].skip).toEqual(true);
    });
  });

  describe('when the chartEmbeddablesEnabled experimental feature flag is enabled', () => {
    beforeEach(() => {
      const mockMapping: Partial<ExperimentalFeatures> = {
        chartEmbeddablesEnabled: true,
      };

      mockUseIsExperimentalFeatureEnabled.mockImplementation(
        getMockUseIsExperimentalFeatureEnabled(mockMapping)
      );

      wrapper = mount(<MatrixHistogram {...mockMatrixOverTimeHistogramProps} />, {
        wrappingComponent: TestProviders,
      });
    });
    test('it should not render VisualizationActions', () => {
      expect(wrapper.find(`[data-test-subj="visualizationActions"]`).exists()).toEqual(false);
    });

    test('it should not fetch Matrix Histogram data', () => {
      expect(mockUseMatrix.mock.calls[0][0].skip).toEqual(true);
    });

    test('it should render Lens Embeddable', () => {
      expect(wrapper.find(`[data-test-subj="visualization-embeddable"]`).exists()).toEqual(true);
    });

    test('it should render visualization count as subtitle', () => {
      mockUseMatrix.mockReturnValue([
        false,
        {
          data: [],
          inspect: false,
          totalCount: 0,
        },
      ]);
      wrapper.setProps({ endDate: 100 });
      wrapper.update();

      expect(wrapper.find(`[data-test-subj="header-section-subtitle"]`).text()).toEqual(
        'Showing: 999 events'
      );
    });

    test('it should render 0 as subtitle when buckets are empty', () => {
      mockUseVisualizationResponse.mockReturnValue({
        responses: [{ aggregations: [{ buckets: [] }], hits: { total: 999 } }],
      });
      mockUseMatrix.mockReturnValue([
        false,
        {
          data: [],
          inspect: false,
          totalCount: 0,
        },
      ]);
      wrapper.setProps({ endDate: 100 });
      wrapper.update();

      expect(wrapper.find(`[data-test-subj="header-section-subtitle"]`).text()).toEqual(
        'Showing: 0 events'
      );
    });
  });
});
