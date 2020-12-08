/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl, nextTick, shallowWithIntl } from '@kbn/test/jest';
import { EnabledFeatures } from './enabled_features';
import { KibanaFeatureConfig } from '../../../../../features/public';
import { DEFAULT_APP_CATEGORIES } from '../../../../../../../src/core/public';
import { findTestSubject } from '@kbn/test/jest';
import { EuiCheckboxProps } from '@elastic/eui';

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
  const getUrlForApp = (appId: string) => appId;

  it(`renders as expected`, () => {
    expect(
      shallowWithIntl<EnabledFeatures>(
        <EnabledFeatures
          features={features}
          space={{
            id: 'my-space',
            name: 'my space',
            disabledFeatures: ['feature-1', 'feature-2'],
          }}
          securityEnabled={true}
          onChange={jest.fn()}
          getUrlForApp={getUrlForApp}
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
        securityEnabled={true}
        onChange={changeHandler}
        getUrlForApp={getUrlForApp}
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
        securityEnabled={true}
        onChange={changeHandler}
        getUrlForApp={getUrlForApp}
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
        securityEnabled={true}
        onChange={changeHandler}
        getUrlForApp={getUrlForApp}
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
        securityEnabled={true}
        onChange={changeHandler}
        getUrlForApp={getUrlForApp}
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
        securityEnabled={true}
        onChange={jest.fn()}
        getUrlForApp={getUrlForApp}
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
          securityEnabled={true}
          onChange={changeHandler}
          getUrlForApp={getUrlForApp}
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
          securityEnabled={true}
          onChange={changeHandler}
          getUrlForApp={getUrlForApp}
        />
      );

      findTestSubject(wrapper, `featureCategoryButton_management`).simulate('click');
      expect(changeHandler).toBeCalledTimes(1);

      const updatedSpace = changeHandler.mock.calls[0][0];

      expect(updatedSpace.disabledFeatures).toEqual(['feature-3']);
    });
  });
});
