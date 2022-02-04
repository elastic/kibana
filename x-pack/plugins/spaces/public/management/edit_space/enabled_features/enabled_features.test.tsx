/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCheckboxProps } from '@elastic/eui';
import React from 'react';

import { findTestSubject, mountWithIntl, nextTick, shallowWithIntl } from '@kbn/test-jest-helpers';
import { DEFAULT_APP_CATEGORIES } from 'src/core/public';

import type { KibanaFeatureConfig } from '../../../../../features/public';
import { EnabledFeatures } from './enabled_features';

const features: KibanaFeatureConfig[] = [
  {
    id: 'feature-1',
    name: 'Feature 1',
    app: [],
    category: DEFAULT_APP_CATEGORIES.kibana,
    privileges: null,
  },
  {
    id: 'feature-2',
    name: 'Feature 2',
    app: [],
    category: DEFAULT_APP_CATEGORIES.kibana,
    privileges: null,
  },
];

describe('EnabledFeatures', () => {
  it(`renders as expected`, () => {
    expect(
      shallowWithIntl(
        <EnabledFeatures
          features={features}
          space={{
            id: 'my-space',
            name: 'my space',
            disabledFeatures: ['feature-1', 'feature-2'],
          }}
          onChange={jest.fn()}
        />
      )
    ).toMatchSnapshot();
  });

  it('allows all features in a category to be toggled on', () => {
    const changeHandler = jest.fn();

    const wrapper = mountWithIntl(
      <EnabledFeatures
        features={features}
        space={{
          id: 'my-space',
          name: 'my space',
          disabledFeatures: ['feature-1', 'feature-2'],
        }}
        onChange={changeHandler}
      />
    );

    // Click category-level toggle
    const {
      onChange = () => {
        throw new Error('expected onChange to be defined');
      },
    } = wrapper.find('input#featureCategoryCheckbox_kibana').props() as EuiCheckboxProps;
    onChange({ target: { checked: true } } as any);

    // Ask to show all features
    findTestSubject(wrapper, `featureCategoryButton_kibana`).simulate('click');

    expect(changeHandler).toBeCalledTimes(1);

    const updatedSpace = changeHandler.mock.calls[0][0];

    expect(updatedSpace.disabledFeatures).toEqual([]);
  });

  it('allows all features in a category to be toggled off', async () => {
    const changeHandler = jest.fn();

    const wrapper = mountWithIntl(
      <EnabledFeatures
        features={features}
        space={{
          id: 'my-space',
          name: 'my space',
          disabledFeatures: [],
        }}
        onChange={changeHandler}
      />
    );

    // Click category-level toggle
    const {
      onChange = () => {
        throw new Error('expected onChange to be defined');
      },
    } = wrapper.find('input#featureCategoryCheckbox_kibana').props() as EuiCheckboxProps;
    onChange({ target: { checked: false } } as any);

    // Ask to show all features
    findTestSubject(wrapper, `featureCategoryButton_kibana`).simulate('click');

    await nextTick();
    wrapper.update();

    expect(changeHandler).toBeCalledTimes(1);

    const updatedSpace = changeHandler.mock.calls[0][0];

    expect(updatedSpace.disabledFeatures).toEqual(['feature-1', 'feature-2']);
  });

  it('allows all features to be toggled off', async () => {
    const changeHandler = jest.fn();

    const wrapper = mountWithIntl(
      <EnabledFeatures
        features={features}
        space={{
          id: 'my-space',
          name: 'my space',
          disabledFeatures: [],
        }}
        onChange={changeHandler}
      />
    );

    // show should not be visible when all features are already visible
    expect(findTestSubject(wrapper, 'showAllFeaturesLink')).toHaveLength(0);
    findTestSubject(wrapper, 'hideAllFeaturesLink').simulate('click');

    await nextTick();
    wrapper.update();

    expect(changeHandler).toBeCalledTimes(1);

    const updatedSpace = changeHandler.mock.calls[0][0];

    expect(updatedSpace.disabledFeatures).toEqual(['feature-1', 'feature-2']);
  });

  it('allows all features to be toggled on', async () => {
    const changeHandler = jest.fn();

    const wrapper = mountWithIntl(
      <EnabledFeatures
        features={features}
        space={{
          id: 'my-space',
          name: 'my space',
          disabledFeatures: ['feature-1', 'feature-2'],
        }}
        onChange={changeHandler}
      />
    );

    // hide should not be visible when all features are already hidden
    expect(findTestSubject(wrapper, 'hideAllFeaturesLink')).toHaveLength(0);
    findTestSubject(wrapper, 'showAllFeaturesLink').simulate('click');

    await nextTick();
    wrapper.update();

    expect(changeHandler).toBeCalledTimes(1);

    const updatedSpace = changeHandler.mock.calls[0][0];

    expect(updatedSpace.disabledFeatures).toEqual([]);
  });

  it('displays both show and hide options when a non-zero subset of features are toggled on', async () => {
    const wrapper = mountWithIntl(
      <EnabledFeatures
        features={features}
        space={{
          id: 'my-space',
          name: 'my space',
          disabledFeatures: ['feature-1'],
        }}
        onChange={jest.fn()}
      />
    );
    expect(findTestSubject(wrapper, 'hideAllFeaturesLink')).toHaveLength(1);
    expect(findTestSubject(wrapper, 'showAllFeaturesLink')).toHaveLength(1);
  });

  describe('feature category button', () => {
    it(`does not toggle visibility when it contains more than one item`, () => {
      const changeHandler = jest.fn();
      const wrapper = mountWithIntl(
        <EnabledFeatures
          features={features}
          space={{
            id: 'my-space',
            name: 'my space',
            disabledFeatures: [],
          }}
          onChange={changeHandler}
        />
      );

      findTestSubject(wrapper, `featureCategoryButton_kibana`).simulate('click');
      expect(changeHandler).not.toHaveBeenCalled();
    });

    it('toggles item visibility when the category contains a single item', () => {
      const changeHandler = jest.fn();
      const wrapper = mountWithIntl(
        <EnabledFeatures
          features={[
            ...features,
            {
              id: 'feature-3',
              name: 'Feature 3',
              app: [],
              category: DEFAULT_APP_CATEGORIES.management,
              privileges: null,
            },
          ]}
          space={{
            id: 'my-space',
            name: 'my space',
            disabledFeatures: [],
          }}
          onChange={changeHandler}
        />
      );

      findTestSubject(wrapper, `featureCategoryButton_management`).simulate('click');
      expect(changeHandler).toBeCalledTimes(1);

      const updatedSpace = changeHandler.mock.calls[0][0];

      expect(updatedSpace.disabledFeatures).toEqual(['feature-3']);
    });
  });
});
