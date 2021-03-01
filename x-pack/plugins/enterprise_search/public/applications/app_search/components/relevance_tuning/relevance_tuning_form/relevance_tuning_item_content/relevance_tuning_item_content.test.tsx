/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { SchemaTypes } from '../../../../../shared/types';
import { BoostType } from '../../types';

import { RelevanceTuningItemContent } from './relevance_tuning_item_content';
import { TextSearchToggle } from './text_search_toggle';
import { WeightSlider } from './weight_slider';

describe('RelevanceTuningItemContent', () => {
  const props = {
    name: 'foo',
    type: 'text' as SchemaTypes,
    boosts: [
      {
        factor: 2,
        type: BoostType.Value,
      },
    ],
    field: {
      weight: 1,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<RelevanceTuningItemContent {...props} />);

    const textSearchToggle = wrapper.find(TextSearchToggle);
    expect(textSearchToggle.exists()).toBe(true);
    expect(textSearchToggle.prop('name')).toBe(props.name);
    expect(textSearchToggle.prop('type')).toBe(props.type);
    expect(textSearchToggle.prop('field')).toBe(props.field);

    const weightSlider = wrapper.find(WeightSlider);
    expect(weightSlider.exists()).toBe(true);
    expect(weightSlider.prop('name')).toBe(props.name);
    expect(weightSlider.prop('field')).toBe(props.field);
  });

  it('will not render a WeightSlider if the field prop is empty', () => {
    const wrapper = shallow(
      <RelevanceTuningItemContent
        {...{
          ...props,
          field: undefined,
        }}
      />
    );

    expect(wrapper.find(WeightSlider).exists()).toBe(false);
  });
});
