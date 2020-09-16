/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import d3 from 'd3';
import { HistogramInner } from '../index';
import response from './response.json';
import {
  getDurationFormatter,
  asInteger,
} from '../../../../../utils/formatters';
import {
  disableConsoleWarning,
  toJson,
  mountWithTheme,
} from '../../../../../utils/testHelpers';
import { getFormattedBuckets } from '../../../../app/TransactionDetails/Distribution/index';

describe('Histogram', () => {
  let mockConsole;
  let wrapper;

  const onClick = jest.fn();

  beforeAll(() => {
    mockConsole = disableConsoleWarning('Warning: componentWillReceiveProps');
  });

  afterAll(() => {
    mockConsole.mockRestore();
  });

  beforeEach(() => {
    const buckets = getFormattedBuckets(response.buckets, response.bucketSize);
    const xMax = d3.max(buckets, (d) => d.x);
    const timeFormatter = getDurationFormatter(xMax);

    wrapper = mountWithTheme(
      <HistogramInner
        buckets={buckets}
        bucketSize={response.bucketSize}
        transactionId="myTransactionId"
        onClick={onClick}
        formatX={(time) => timeFormatter(time).formatted}
        formatYShort={(t) => `${asInteger(t)} occ.`}
        formatYLong={(t) => `${asInteger(t)} occurrences`}
        tooltipHeader={(bucket) => {
          const xFormatted = timeFormatter(bucket.x);
          const x0Formatted = timeFormatter(bucket.x0);
          return `${x0Formatted.value} - ${xFormatted.value} ${xFormatted.unit}`;
        }}
        width={800}
      />
    );
  });

  describe('Initially', () => {
    it('should have default markup', () => {
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    it('should not show tooltip', () => {
      expect(wrapper.find('Tooltip').length).toBe(0);
    });
  });

  describe('when hovering over an empty bucket', () => {
    beforeEach(() => {
      wrapper.find('.rv-voronoi__cell').at(2).simulate('mouseOver');
    });

    it('should not display tooltip', () => {
      expect(wrapper.find('Tooltip').length).toBe(0);
    });
  });

  describe('when hovering over a non-empty bucket', () => {
    beforeEach(() => {
      wrapper.find('.rv-voronoi__cell').at(7).simulate('mouseOver');
    });

    it('should display tooltip', () => {
      const tooltips = wrapper.find('Tooltip');

      expect(tooltips.length).toBe(1);
      expect(tooltips.prop('header')).toBe('811 - 927 ms');
      expect(tooltips.prop('tooltipPoints')).toEqual([
        { value: '49 occurrences' },
      ]);
      expect(tooltips.prop('x')).toEqual(869010);
      expect(tooltips.prop('y')).toEqual(27.5);
    });

    it('should have correct markup for tooltip', () => {
      const tooltips = wrapper.find('Tooltip');
      expect(toJson(tooltips)).toMatchSnapshot();
    });
  });

  describe('when clicking on a non-empty bucket', () => {
    beforeEach(() => {
      wrapper.find('.rv-voronoi__cell').at(7).simulate('click');
    });

    it('should call onClick with bucket', () => {
      expect(onClick).toHaveBeenCalledWith({
        samples: [
          {
            transactionId: '99c50a5b-44b4-4289-a3d1-a2815d128192',
          },
        ],
        style: { cursor: 'pointer' },
        xCenter: 869010,
        x0: 811076,
        x: 926944,
        y: 49,
      });
    });
  });
});
