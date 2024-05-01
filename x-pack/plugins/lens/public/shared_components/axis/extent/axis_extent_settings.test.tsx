/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps } from 'react';
import { shallowWithIntl as shallow } from '@kbn/test-jest-helpers';
import { AxisBoundsControl, DataBoundsObject, getBounds } from './axis_extent_settings';
import { AxisExtentMode, YScaleType, XScaleType } from '@kbn/expression-xy-plugin/common';
import { UnifiedAxisExtentConfig } from './types';

type Props = ComponentProps<typeof AxisBoundsControl>;

describe('AxisBoundsControl', () => {
  let props: Props;
  beforeEach(() => {
    props = {
      type: 'metric',
      extent: { mode: 'full' },
      setExtent: jest.fn(),
      dataBounds: { min: 0, max: 1000 },
      hasBarOrArea: false,
      disableCustomRange: false,
      testSubjPrefix: 'lnsXY',
      canHaveNiceValues: true,
      scaleType: 'linear',
    };
  });

  it.each<{
    hideShow: 'hide' | 'show';
    type: Props['type'];
    mode: Props['extent']['mode'];
    disableCustomRange: boolean;
  }>([
    { hideShow: 'show', type: 'metric', mode: 'custom', disableCustomRange: false },
    { hideShow: 'show', type: 'metric', mode: 'custom', disableCustomRange: false },
    { hideShow: 'show', type: 'bucket', mode: 'custom', disableCustomRange: false },
    { hideShow: 'show', type: 'bucket', mode: 'custom', disableCustomRange: true },
    { hideShow: 'hide', type: 'metric', mode: 'custom', disableCustomRange: true },
    { hideShow: 'hide', type: 'metric', mode: 'full', disableCustomRange: false },
    { hideShow: 'hide', type: 'metric', mode: 'full', disableCustomRange: false },
    { hideShow: 'hide', type: 'bucket', mode: 'dataBounds', disableCustomRange: false },
    { hideShow: 'hide', type: 'bucket', mode: 'dataBounds', disableCustomRange: true },
    { hideShow: 'hide', type: 'metric', mode: 'full', disableCustomRange: true },
  ])(
    'should $hideShow custom range when type is $type, extent.mode is $mode as disabled is $disableCustomRange',
    ({ type, mode, disableCustomRange, hideShow }) => {
      const component = shallow(
        <AxisBoundsControl
          {...props}
          type={type}
          disableCustomRange={disableCustomRange}
          extent={{ mode }}
        />
      );

      expect(component.find('RangeInputField').exists()).toBe(hideShow === 'show');
    }
  );

  it.each<{
    hideShow: 'hide' | 'show';
    type: Props['type'];
    mode: Props['extent']['mode'];
    canHaveNiceValues: boolean;
  }>([
    { hideShow: 'show', type: 'metric', mode: 'full', canHaveNiceValues: true },
    { hideShow: 'show', type: 'metric', mode: 'custom', canHaveNiceValues: true },
    { hideShow: 'hide', type: 'metric', mode: 'dataBounds', canHaveNiceValues: true },
    { hideShow: 'show', type: 'bucket', mode: 'dataBounds', canHaveNiceValues: true },
    { hideShow: 'show', type: 'bucket', mode: 'custom', canHaveNiceValues: true },
    { hideShow: 'hide', type: 'bucket', mode: 'full', canHaveNiceValues: true },
    { hideShow: 'hide', type: 'metric', mode: 'full', canHaveNiceValues: false },
    { hideShow: 'hide', type: 'metric', mode: 'custom', canHaveNiceValues: false },
    { hideShow: 'hide', type: 'metric', mode: 'dataBounds', canHaveNiceValues: false },
    { hideShow: 'hide', type: 'bucket', mode: 'dataBounds', canHaveNiceValues: false },
    { hideShow: 'hide', type: 'bucket', mode: 'custom', canHaveNiceValues: false },
    { hideShow: 'hide', type: 'bucket', mode: 'full', canHaveNiceValues: false },
  ])(
    'should $hideShow nice values switch when type is $type, extent.mode is $mode as canHaveNiceValues is $canHaveNiceValues',
    ({ type, mode, canHaveNiceValues = true, hideShow }) => {
      const component = shallow(
        <AxisBoundsControl
          {...props}
          type={type}
          canHaveNiceValues={canHaveNiceValues}
          extent={{ mode }}
        />
      );

      expect(component.find('[data-test-subj="lnsXY_axisExtent_niceValues"]').exists()).toBe(
        hideShow === 'show'
      );
    }
  );

  describe('getBounds', () => {
    it.each<{
      mode: AxisExtentMode;
      scaleType?: YScaleType | XScaleType;
      dataBounds?: DataBoundsObject;
      expected: Pick<UnifiedAxisExtentConfig, 'lowerBound' | 'upperBound'>;
    }>([
      // Non-custom cases - reset bounds
      {
        mode: 'full',
        scaleType: 'linear',
        dataBounds: { min: 0, max: 1 },
        expected: { lowerBound: undefined, upperBound: undefined },
      },
      {
        mode: 'full',
        scaleType: 'linear',
        dataBounds: undefined,
        expected: { lowerBound: undefined, upperBound: undefined },
      },
      // Domain purely positive
      {
        mode: 'custom',
        scaleType: 'linear',
        dataBounds: { min: 0, max: 100 },
        expected: { lowerBound: 0, upperBound: 100 },
      },
      {
        mode: 'custom',
        scaleType: 'linear',
        dataBounds: { min: 1, max: 100 },
        expected: { lowerBound: 0, upperBound: 100 },
      },
      {
        mode: 'custom',
        scaleType: 'log',
        dataBounds: { min: 0, max: 100 },
        expected: { lowerBound: 0.01, upperBound: 100 },
      },
      {
        mode: 'custom',
        scaleType: 'log',
        dataBounds: { min: 0.001, max: 100 },
        expected: { lowerBound: 0.01, upperBound: 100 },
      },
      {
        mode: 'custom',
        scaleType: 'log',
        dataBounds: { min: 10, max: 100 },
        expected: { lowerBound: 0.01, upperBound: 100 },
      },

      {
        mode: 'custom',
        scaleType: 'linear',
        dataBounds: { max: 0, min: -100 },
        expected: { lowerBound: -100, upperBound: 0 },
      },
      // Domain purely negative
      {
        mode: 'custom',
        scaleType: 'linear',
        dataBounds: { min: -100, max: -1 },
        expected: { lowerBound: -100, upperBound: 0 },
      },
      {
        mode: 'custom',
        scaleType: 'log',
        dataBounds: { min: -100, max: 0 },
        expected: { lowerBound: -100, upperBound: -0.01 },
      },
      {
        mode: 'custom',
        scaleType: 'log',
        dataBounds: { min: -100, max: -0.001 },
        expected: { lowerBound: -100, upperBound: -0.01 },
      },
      {
        mode: 'custom',
        scaleType: 'log',
        dataBounds: { min: -100, max: -10 },
        expected: { lowerBound: -100, upperBound: -0.01 },
      },
      // Domain crosses 0
      {
        mode: 'custom',
        scaleType: 'log',
        dataBounds: { min: -10, max: 100 },
        expected: { lowerBound: 0.01, upperBound: 100 },
      },
      {
        mode: 'custom',
        scaleType: 'log',
        dataBounds: { min: -100, max: 10 },
        expected: { lowerBound: -100, upperBound: -0.01 },
      },
      {
        mode: 'custom',
        scaleType: 'linear',
        dataBounds: { min: -10, max: 100 },
        expected: { lowerBound: -10, upperBound: 100 },
      },
      {
        mode: 'custom',
        scaleType: 'linear',
        dataBounds: { min: -100, max: 10 },
        expected: { lowerBound: -100, upperBound: 10 },
      },
    ])(
      'should return $expected for $mode mode, $scaleType scale and $dataBounds bounds',
      ({ mode, scaleType, dataBounds, expected }) => {
        const result = getBounds(mode, scaleType, dataBounds);
        expect(result).toEqual(expected);
      }
    );
  });
});
