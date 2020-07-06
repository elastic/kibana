/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';

import { MatrixHistogram } from '.';
import { useQuery } from '../../containers/matrix_histogram';
import { HistogramType } from '../../../graphql/types';
jest.mock('../../lib/kibana');

jest.mock('./matrix_loader', () => {
  return {
    MatrixLoader: () => {
      return <div className="matrixLoader" />;
    },
  };
});

jest.mock('../header_section', () => {
  return {
    HeaderSection: () => <div className="headerSection" />,
  };
});

jest.mock('../charts/barchart', () => {
  return {
    BarChart: () => <div className="barchart" />,
  };
});

jest.mock('../../containers/matrix_histogram', () => {
  return {
    useQuery: jest.fn(),
  };
});

jest.mock('../../components/matrix_histogram/utils', () => {
  return {
    getBarchartConfigs: jest.fn(),
    getCustomChartData: jest.fn().mockReturnValue(true),
  };
});

describe('Matrix Histogram Component', () => {
  let wrapper: ReactWrapper;

  const mockMatrixOverTimeHistogramProps = {
    defaultIndex: ['defaultIndex'],
    defaultStackByOption: { text: 'text', value: 'value' },
    endDate: new Date('2019-07-18T20:00:00.000Z').valueOf(),
    errorMessage: 'error',
    histogramType: HistogramType.alerts,
    id: 'mockId',
    isInspected: false,
    isPtrIncluded: false,
    setQuery: jest.fn(),
    skip: false,
    sourceId: 'default',
    stackByField: 'mockStackByField',
    stackByOptions: [{ text: 'text', value: 'value' }],
    startDate: new Date('2019-07-18T19:00: 00.000Z').valueOf(),
    subtitle: 'mockSubtitle',
    totalCount: -1,
    title: 'mockTitle',
    dispatchSetAbsoluteRangeDatePicker: jest.fn(),
  };

  beforeAll(() => {
    (useQuery as jest.Mock).mockReturnValue({
      data: null,
      loading: false,
      inspect: false,
      totalCount: null,
    });
    wrapper = mount(<MatrixHistogram {...mockMatrixOverTimeHistogramProps} />);
  });
  describe('on initial load', () => {
    test('it renders MatrixLoader', () => {
      expect(wrapper.find('MatrixLoader').exists()).toBe(true);
    });
  });

  describe('spacer', () => {
    test('it renders a spacer by default', () => {
      expect(wrapper.find('[data-test-subj="spacer"]').exists()).toBe(true);
    });

    test('it does NOT render a spacer when showSpacer is false', () => {
      wrapper = mount(<MatrixHistogram {...mockMatrixOverTimeHistogramProps} showSpacer={false} />);
      expect(wrapper.find('[data-test-subj="spacer"]').exists()).toBe(false);
    });
  });

  describe('not initial load', () => {
    beforeAll(() => {
      (useQuery as jest.Mock).mockReturnValue({
        data: [
          { x: 1, y: 2, g: 'g1' },
          { x: 2, y: 4, g: 'g1' },
          { x: 3, y: 6, g: 'g1' },
          { x: 1, y: 1, g: 'g2' },
          { x: 2, y: 3, g: 'g2' },
          { x: 3, y: 5, g: 'g2' },
        ],
        loading: false,
        inspect: false,
        totalCount: 1,
      });
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
