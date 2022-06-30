/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LegendSizeSettings } from './legend_size_settings';
import { EuiSuperSelect } from '@elastic/eui';
import { shallow } from 'enzyme';
import { DEFAULT_LEGEND_SIZE, LegendSize } from '@kbn/visualizations-plugin/public';

describe('legend size settings', () => {
  it('renders nothing if not vertical legend', () => {
    const instance = shallow(
      <LegendSizeSettings
        legendSize={undefined}
        onLegendSizeChange={() => {}}
        isVerticalLegend={false}
        showAutoOption={false}
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
        showAutoOption={false}
      />
    );

    expect(instance.find(EuiSuperSelect).props().valueOfSelected).toBe(
      DEFAULT_LEGEND_SIZE.toString()
    );
  });

  it('reflects current setting in select', () => {
    const CURRENT_SIZE = LegendSize.SMALL;

    const instance = shallow(
      <LegendSizeSettings
        legendSize={CURRENT_SIZE}
        onLegendSizeChange={() => {}}
        isVerticalLegend={true}
        showAutoOption={false}
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
        showAutoOption={false}
      />
    );

    const onChange = instance.find(EuiSuperSelect).props().onChange;

    onChange(LegendSize.EXTRA_LARGE);
    onChange(DEFAULT_LEGEND_SIZE);

    expect(onSizeChange).toHaveBeenNthCalledWith(1, LegendSize.EXTRA_LARGE);
    expect(onSizeChange).toHaveBeenNthCalledWith(2, undefined);
  });

  it('hides "auto" option if visualization not using it', () => {
    const getOptions = (showAutoOption: boolean) =>
      shallow(
        <LegendSizeSettings
          legendSize={LegendSize.LARGE}
          onLegendSizeChange={() => {}}
          isVerticalLegend={true}
          showAutoOption={showAutoOption}
        />
      )
        .find(EuiSuperSelect)
        .props().options;

    const autoOption = expect.objectContaining({ value: LegendSize.AUTO });

    expect(getOptions(true)).toContainEqual(autoOption);
    expect(getOptions(false)).not.toContainEqual(autoOption);
  });
});
