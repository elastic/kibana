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

jest.mock('../../lib/kibana');

jest.mock('./matrix_loader', () => ({
  MatrixLoader: () => <div className="matrixLoader" />,
}));

jest.mock('../header_section', () => ({
  HeaderSection: () => <div className="headerSection" />,
}));

jest.mock('../charts/barchart', () => ({
  BarChart: () => <div className="barchart" />,
}));

jest.mock('../../containers/matrix_histogram', () => ({
  useMatrixHistogramCombined: jest.fn(),
}));

jest.mock('../../components/matrix_histogram/utils', () => ({
  getBarchartConfigs: jest.fn(),
  getCustomChartData: jest.fn().mockReturnValue(true),
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

  beforeAll(() => {
    (useMatrixHistogramCombined as jest.Mock).mockReturnValue([
      false,
      {
        data: null,
        inspect: false,
        totalCount: null,
      },
    ]);
    wrapper = mount(<MatrixHistogram {...mockMatrixOverTimeHistogramProps} />, {
      wrappingComponent: TestProviders,
    });
  });

  describe('on initial load', () => {
    test('it requests Matrix Histogram', () => {
      expect(useMatrixHistogramCombined).toHaveBeenCalledWith({
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
    beforeAll(() => {
      (useMatrixHistogramCombined as jest.Mock).mockReturnValue([
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
      expect(wrapper.find('EuiSelect').exists()).toBe(false);
    });
  });
});
