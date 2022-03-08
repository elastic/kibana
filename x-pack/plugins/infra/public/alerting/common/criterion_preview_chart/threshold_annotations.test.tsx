/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { shallow } from 'enzyme';
import React from 'react';
import { Comparator } from '../../../../common/alerting/metrics';
import { Color } from '../../../../common/color_palette';
import { ThresholdAnnotations } from './threshold_annotations';

jest.mock('@elastic/charts', () => {
  const original = jest.requireActual('@elastic/charts');

  const mockComponent = (props: {}) => {
    return <div {...props} />;
  };

  return {
    ...original,
    LineAnnotation: mockComponent,
    RectAnnotation: mockComponent,
  };
});

describe('ThresholdAnnotations', () => {
  async function setup(props = {}) {
    const defaultProps = {
      threshold: [20, 30],
      sortedThresholds: [20, 30],
      comparator: Comparator.GT,
      color: Color.color0,
      id: 'testId',
      firstTimestamp: 123456789,
      lastTimestamp: 987654321,
      domain: { min: 10, max: 20 },
    };
    const wrapper = shallow(<ThresholdAnnotations {...defaultProps} {...props} />);

    return wrapper;
  }

  it('should render a line annotation for each threshold', async () => {
    const wrapper = await setup();

    const annotation = wrapper.find('[data-test-subj="threshold-line"]');
    const expectedValues = [{ dataValue: 20 }, { dataValue: 30 }];
    const values = annotation.prop('dataValues');

    expect(values).toEqual(expectedValues);
    expect(annotation.length).toBe(1);
  });

  it('should render a rectangular annotation for in between thresholds', async () => {
    const wrapper = await setup({ comparator: Comparator.BETWEEN });

    const annotation = wrapper.find('[data-test-subj="between-rect"]');
    const expectedValues = [
      {
        coordinates: {
          x0: 123456789,
          x1: 987654321,
          y0: 20,
          y1: 30,
        },
      },
    ];
    const values = annotation.prop('dataValues');

    expect(values).toEqual(expectedValues);
  });

  it('should render an upper rectangular annotation for outside range thresholds', async () => {
    const wrapper = await setup({ comparator: Comparator.OUTSIDE_RANGE });

    const annotation = wrapper.find('[data-test-subj="outside-range-lower-rect"]');
    const expectedValues = [
      {
        coordinates: {
          x0: 123456789,
          x1: 987654321,
          y0: 10,
          y1: 20,
        },
      },
    ];
    const values = annotation.prop('dataValues');

    expect(values).toEqual(expectedValues);
  });

  it('should render a lower rectangular annotation for outside range thresholds', async () => {
    const wrapper = await setup({ comparator: Comparator.OUTSIDE_RANGE });

    const annotation = wrapper.find('[data-test-subj="outside-range-upper-rect"]');
    const expectedValues = [
      {
        coordinates: {
          x0: 123456789,
          x1: 987654321,
          y0: 30,
          y1: 20,
        },
      },
    ];
    const values = annotation.prop('dataValues');

    expect(values).toEqual(expectedValues);
  });

  it('should render a rectangular annotation for below thresholds', async () => {
    const wrapper = await setup({ comparator: Comparator.LT });

    const annotation = wrapper.find('[data-test-subj="below-rect"]');
    const expectedValues = [
      {
        coordinates: {
          x0: 123456789,
          x1: 987654321,
          y0: 10,
          y1: 20,
        },
      },
    ];
    const values = annotation.prop('dataValues');

    expect(values).toEqual(expectedValues);
  });

  it('should render a rectangular annotation for above thresholds', async () => {
    const wrapper = await setup({ comparator: Comparator.GT });

    const annotation = wrapper.find('[data-test-subj="above-rect"]');
    const expectedValues = [
      {
        coordinates: {
          x0: 123456789,
          x1: 987654321,
          y0: 20,
          y1: 20,
        },
      },
    ];
    const values = annotation.prop('dataValues');

    expect(values).toEqual(expectedValues);
  });
});
