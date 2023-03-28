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

import { EuiCallOut, EuiText, EuiButton } from '@elastic/eui';

import {
  CustomizeIngestPipelineItem,
  CopyAndCustomizePipelinePanel,
} from './customize_pipeline_item';

const DEFAULT_VALUES = {
  // LicensingLogic
  hasPlatinumLicense: true,
  // IndexViewLogic
  indexName: crawlerIndex.name,
  ingestionMethod: 'crawler',
  // KibanaLogic
  isCloud: false,
  // PipelineLogic
  hasIndexIngestionPipeline: false,
};

describe('CustomizeIngestPipelineItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({ ...DEFAULT_VALUES });
  });
  it('gates cta without license', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      hasPlatinumLicense: false,
      isCloud: false,
    });
    const wrapper = shallow(<CustomizeIngestPipelineItem />);
    expect(wrapper.find(EuiText)).toHaveLength(1);

    expect(wrapper.find(EuiText).children().text()).toContain('With a platinum license');
  });
});

describe('CopyAndCustomizePipelinePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({ ...DEFAULT_VALUES });
  });
  it('renders callout with default pipeline', () => {
    const wrapper = shallow(<CopyAndCustomizePipelinePanel />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
    expect(wrapper.find(EuiButton)).toHaveLength(1);
    expect(wrapper.find(EuiButton).render().text()).toBe('Copy and customize');
  });
  it('returns null if gated', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      hasPlatinumLicense: false,
      isCloud: false,
    });

    const wrapper = shallow(<CopyAndCustomizePipelinePanel />);
    expect(wrapper.isEmptyRender()).toBe(true);
  });
  it('returns null if you have a custom pipeline', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      hasIndexIngestionPipeline: true,
    });

    const wrapper = shallow(<CopyAndCustomizePipelinePanel />);
    expect(wrapper.isEmptyRender()).toBe(true);
  });
});
