/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';

import { MatrixHistogram } from '.';
import { useMatrixHistogramCombined } from '../../containers/matrix_histogram';
import { MatrixHistogramType } from '../../../../common/search_strategy/security_solution';
import { TestProviders } from '../../mock';
import { mockRuntimeMappings } from '../../containers/source/mock';
import { dnsTopDomainsLensAttributes } from '../visualization_actions/lens_attributes/network/dns_top_domains';
import { useRouteSpy } from '../../utils/route/use_route_spy';
import { useQueryToggle } from '../../containers/query_toggle';

jest.mock('../../containers/query_toggle');
jest.mock('../../lib/kibana');

jest.mock('./matrix_loader', () => ({
  MatrixLoader: () => <div className="matrixLoader" />,
}));

jest.mock('../charts/barchart', () => ({
  BarChart: () => <div className="barchart" />,
}));

jest.mock('../../containers/matrix_histogram');

jest.mock('../visualization_actions', () => ({
  VisualizationActions: jest.fn(({ className }: { className: string }) => (
    <div data-test-subj="mock-viz-actions" className={className} />
  )),
}));

jest.mock('../inspect', () => ({
  InspectButton: jest.fn(() => <div data-test-subj="mock-inspect" />),
}));

jest.mock('../../components/matrix_histogram/utils', () => ({
  getBarchartConfigs: jest.fn(),
  getCustomChartData: jest.fn().mockReturnValue(true),
}));

jest.mock('../../utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn().mockReturnValue([
    {
      detailName: 'mockHost',
      pageName: 'hosts',
      tabName: 'externalAlerts',
    },
  ]),
}));

describe('Matrix Histogram Component', () => {
  let wrapper: ReactWrapper;

  const mockMatrixOverTimeHistogramProps = {
    defaultIndex: ['defaultIndex'],
    defaultStackByOption: { text: 'text', value: 'value' },
    endDate: '2019-07-18T20:00:00.000Z',
    errorMessage: 'error',
    histogramType: MatrixHistogramType.alerts,
    id: 'mockId',
    indexNames: [],
    isInspected: false,
    isPtrIncluded: false,
    setQuery: jest.fn(),
    skip: false,
    sourceId: 'default',
    stackByField: 'mockStackByField',
    stackByOptions: [{ text: 'text', value: 'value' }],
    startDate: '2019-07-18T19:00: 00.000Z',
    subtitle: 'mockSubtitle',
    totalCount: -1,
    title: 'mockTitle',
    runtimeMappings: mockRuntimeMappings,
  };
  const mockUseMatrix = useMatrixHistogramCombined as jest.Mock;
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  const mockSetToggle = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
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
    test("it doesn't render Inspect button by default on Host page", () => {
      (useRouteSpy as jest.Mock).mockReturnValue([
        {
          detailName: 'mockHost',
          pageName: 'hosts',
          tabName: 'externalAlerts',
        },
      ]);

      const testProps = {
        ...mockMatrixOverTimeHistogramProps,
        lensAttributes: dnsTopDomainsLensAttributes,
      };
      wrapper = mount(<MatrixHistogram {...testProps} />, {
        wrappingComponent: TestProviders,
      });
      expect(wrapper.find('[data-test-subj="mock-inspect"]').exists()).toBe(false);
    });

    test("it doesn't render Inspect button by default on Network page", () => {
      (useRouteSpy as jest.Mock).mockReturnValue([
        {
          detailName: undefined,
          pageName: 'network',
          tabName: 'external-alerts',
        },
      ]);

      const testProps = {
        ...mockMatrixOverTimeHistogramProps,
        lensAttributes: dnsTopDomainsLensAttributes,
      };
      wrapper = mount(<MatrixHistogram {...testProps} />, {
        wrappingComponent: TestProviders,
      });
      expect(wrapper.find('[data-test-subj="mock-inspect"]').exists()).toBe(false);
    });

    test('it render Inspect button by default on other pages', () => {
      (useRouteSpy as jest.Mock).mockReturnValue([
        {
          detailName: undefined,
          pageName: 'overview',
          tabName: undefined,
        },
      ]);

      const testProps = {
        ...mockMatrixOverTimeHistogramProps,
        lensAttributes: dnsTopDomainsLensAttributes,
      };
      wrapper = mount(<MatrixHistogram {...testProps} />, {
        wrappingComponent: TestProviders,
      });
      expect(wrapper.find('[data-test-subj="mock-inspect"]').exists()).toBe(true);
    });
  });

  describe('VisualizationActions', () => {
    test('it renders VisualizationActions on Host page if lensAttributes is provided', () => {
      (useRouteSpy as jest.Mock).mockReturnValue([
        {
          detailName: 'mockHost',
          pageName: 'hosts',
          tabName: 'externalAlerts',
        },
      ]);

      const testProps = {
        ...mockMatrixOverTimeHistogramProps,
        lensAttributes: dnsTopDomainsLensAttributes,
      };
      wrapper = mount(<MatrixHistogram {...testProps} />, {
        wrappingComponent: TestProviders,
      });
      expect(wrapper.find('[data-test-subj="mock-viz-actions"]').exists()).toBe(true);
      expect(wrapper.find('[data-test-subj="mock-viz-actions"]').prop('className')).toEqual(
        'histogram-viz-actions'
      );
    });

    test('it renders VisualizationActions on Network page if lensAttributes is provided', () => {
      (useRouteSpy as jest.Mock).mockReturnValue([
        {
          detailName: undefined,
          pageName: 'network',
          tabName: 'external-alerts',
        },
      ]);

      const testProps = {
        ...mockMatrixOverTimeHistogramProps,
        lensAttributes: dnsTopDomainsLensAttributes,
      };
      wrapper = mount(<MatrixHistogram {...testProps} />, {
        wrappingComponent: TestProviders,
      });
      expect(wrapper.find('[data-test-subj="mock-viz-actions"]').exists()).toBe(true);
      expect(wrapper.find('[data-test-subj="mock-viz-actions"]').prop('className')).toEqual(
        'histogram-viz-actions'
      );
    });

    test("it doesn't renders VisualizationActions except Host / Network pages", () => {
      const testProps = {
        ...mockMatrixOverTimeHistogramProps,
        lensAttributes: dnsTopDomainsLensAttributes,
      };

      (useRouteSpy as jest.Mock).mockReturnValue([
        {
          detailName: undefined,
          pageName: 'overview',
          tabName: undefined,
        },
      ]);

      wrapper = mount(<MatrixHistogram {...testProps} />, {
        wrappingComponent: TestProviders,
      });
      expect(wrapper.find('[data-test-subj="mock-viz-actions"]').exists()).toBe(false);
    });
  });

  describe('toggle query', () => {
    const testProps = {
      ...mockMatrixOverTimeHistogramProps,
      lensAttributes: dnsTopDomainsLensAttributes,
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
});
