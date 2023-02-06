/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';
import { crawlerIndex } from '../../../../__mocks__/view_index.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiText, EuiButtonEmpty } from '@elastic/eui';

import { CustomizeIngestPipelineItem } from './customize_pipeline_item';

const DEFAULT_VALUES = {
  // LicensingLogic
  hasPlatinumLicense: true,
  // IndexViewLogic
  indexName: crawlerIndex.name,
  ingestionMethod: 'crawler',
  // KibanaLogic
  isCloud: false,
};

describe('CustomizeIngestPipelineItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({ ...DEFAULT_VALUES });
  });
  it('renders cta with license', () => {
    const wrapper = shallow(<CustomizeIngestPipelineItem />);
    expect(wrapper.find(EuiButtonEmpty)).toHaveLength(1);
    expect(wrapper.find(EuiText)).toHaveLength(1);
    expect(wrapper.find(EuiText).children().text()).toContain('create an index-specific version');
    expect(wrapper.find(EuiText).children().text()).not.toContain('With a platinum license');
  });
  it('renders cta on cloud', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      hasPlatinumLicense: false,
      isCloud: true,
    });
    const wrapper = shallow(<CustomizeIngestPipelineItem />);
    expect(wrapper.find(EuiText)).toHaveLength(1);
    expect(wrapper.find(EuiText).children().text()).toContain('create an index-specific version');
    expect(wrapper.find(EuiText).children().text()).not.toContain('With a platinum license');
  });
  it('gates cta without license', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      hasPlatinumLicense: false,
      isCloud: false,
    });
    const wrapper = shallow(<CustomizeIngestPipelineItem />);
    expect(wrapper.find(EuiButtonEmpty)).toHaveLength(1);
    expect(wrapper.find(EuiText)).toHaveLength(1);

    const ctaButton = wrapper.find(EuiButtonEmpty);
    expect(ctaButton.prop('disabled')).toBe(true);
    expect(ctaButton.prop('iconType')).toBe('lock');

    expect(wrapper.find(EuiText).children().text()).toContain('With a platinum license');
  });
});
