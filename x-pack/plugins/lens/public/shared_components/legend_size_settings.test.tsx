/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DEFAULT_LEGEND_SIZE, LegendSizes, LegendSizeSettings } from './legend_size_settings';
import { EuiSuperSelect } from '@elastic/eui';
import { shallow } from 'enzyme';

describe('legend size settings', () => {
  it('renders nothing if not vertical legend', () => {
    const instance = shallow(
      <LegendSizeSettings
        legendSize={undefined}
        onLegendSizeChange={() => {}}
        isVerticalLegend={false}
      />
    );

    expect(instance.html()).toBeNull();
  });

  it('defaults to correct value', () => {
    const instance = shallow(
      <LegendSizeSettings
        legendSize={undefined}
        onLegendSizeChange={() => {}}
        isVerticalLegend={true}
      />
    );

    expect(instance.find(EuiSuperSelect).props().valueOfSelected).toBe(DEFAULT_LEGEND_SIZE);
  });

  it('reflects current setting in select', () => {
    const CURRENT_SIZE = LegendSizes.SMALL;

    const instance = shallow(
      <LegendSizeSettings
        legendSize={Number(CURRENT_SIZE)}
        onLegendSizeChange={() => {}}
        isVerticalLegend={true}
      />
    );

    expect(instance.find(EuiSuperSelect).props().valueOfSelected).toBe(CURRENT_SIZE);
  });

  it('allows user to select a new option', () => {
    const onSizeChange = jest.fn();

    const instance = shallow(
      <LegendSizeSettings
        legendSize={undefined}
        onLegendSizeChange={onSizeChange}
        isVerticalLegend={true}
      />
    );

    const onChange = instance.find(EuiSuperSelect).props().onChange;

    onChange(LegendSizes.EXTRA_LARGE);
    onChange(DEFAULT_LEGEND_SIZE);

    expect(onSizeChange).toHaveBeenNthCalledWith(1, Number(LegendSizes.EXTRA_LARGE));
    expect(onSizeChange).toHaveBeenNthCalledWith(2, undefined);
  });

  it('hides "auto" option if visualization not using it', () => {
    const getOptions = (legendSize: number) =>
      shallow(
        <LegendSizeSettings
          legendSize={legendSize}
          onLegendSizeChange={() => {}}
          isVerticalLegend={true}
        />
      )
        .find(EuiSuperSelect)
        .props().options;

    expect(getOptions(Number(LegendSizes.AUTO))).toContainEqual(
      expect.objectContaining({ value: LegendSizes.AUTO })
    );
    expect(getOptions(Number(LegendSizes.LARGE))).not.toContainEqual(
      expect.objectContaining({ value: LegendSizes.AUTO })
    );
  });
});
