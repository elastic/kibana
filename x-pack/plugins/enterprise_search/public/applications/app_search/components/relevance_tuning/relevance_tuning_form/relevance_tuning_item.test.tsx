/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { SchemaTypes } from '../../../../shared/types';

import { BoostIcon } from '../boost_icon';
import { Boost, BoostType, SearchField } from '../types';

import { RelevanceTuningItem } from './relevance_tuning_item';
import { ValueBadge } from './value_badge';

describe('RelevanceTuningItem', () => {
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

  describe('boosts prop', () => {
    const renderComponentWithBoostsConfig = (boosts?: Boost[]) => {
      return shallow(
        <RelevanceTuningItem
          {...{
            ...props,
            boosts,
          }}
        />
      );
    };

    describe('when there are boosts for this field', () => {
      it('renders an icon for each boost that is applied', () => {
        const wrapper = renderComponentWithBoostsConfig([
          {
            factor: 2,
            type: BoostType.Value,
          },
          {
            factor: 3,
            type: BoostType.Proximity,
          },
        ]);
        expect(wrapper.find(BoostIcon).length).toBe(2);
        expect(wrapper.find(BoostIcon).map((euiToken) => euiToken.prop('type'))).toEqual([
          BoostType.Value,
          BoostType.Proximity,
        ]);
      });
    });

    describe('when there are no boosts for this field', () => {
      const wrapper = renderComponentWithBoostsConfig();

      it('renders an icon for each boost that is applied', () => {
        expect(wrapper.find(BoostIcon).length).toBe(0);
      });
    });
  });

  describe('field prop', () => {
    const renderComponentWithFieldConfig = (field?: SearchField) => {
      return shallow(
        <RelevanceTuningItem
          {...{
            ...props,
            field,
          }}
        />
      );
    };

    describe('when weight is set to any positive number', () => {
      const wrapper = renderComponentWithFieldConfig({
        weight: 1,
      });

      it('will show the weight with an "enabled" style', () => {
        const valueBadge = wrapper.find(ValueBadge);
        expect(valueBadge.dive().text()).toContain('1');
        expect(valueBadge.prop('disabled')).toBe(false);
      });
    });

    describe('when weight set to "0", which means this field will not be searched', () => {
      const wrapper = renderComponentWithFieldConfig({
        weight: 0,
      });

      it('will show 0 with a "disabled" style', () => {
        const valueBadge = wrapper.find(ValueBadge);
        expect(valueBadge.dive().text()).toContain('0');
        expect(valueBadge.prop('disabled')).toBe(true);
      });
    });

    describe('when there is no weight set, which means this field will not be searched', () => {
      const wrapper = renderComponentWithFieldConfig();

      it('will show "0" with a "disabled" style', () => {
        const valueBadge = wrapper.find(ValueBadge);
        expect(valueBadge.dive().text()).toContain('0');
        expect(valueBadge.prop('disabled')).toBe(true);
      });
    });
  });
});
