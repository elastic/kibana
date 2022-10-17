/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBadge } from '@elastic/eui';

import { EuiButtonEmptyTo } from '../../../../../shared/react_router_helpers';

import { CustomPipelineItem } from './custom_pipeline_item';

describe('CustomPipelineItem', () => {
  it('renders custom pipeline item', () => {
    const indexName = 'fake-index-name';
    const pipelineSuffix = 'custom-pipeline';
    const ingestionMethod = 'crawler';
    const processorsCount = 12;

    const wrapper = shallow(
      <CustomPipelineItem
        indexName={indexName}
        pipelineSuffix={pipelineSuffix}
        ingestionMethod={ingestionMethod}
        processorsCount={processorsCount}
      />
    );
    const title = wrapper.find('h4').text();
    const editLink = wrapper.find(EuiButtonEmptyTo).prop('to');
    const trackLink = wrapper.find(EuiButtonEmptyTo).prop('data-telemetry-id');
    const processorCountBadge = wrapper.find(EuiBadge).render().text();

    expect(title).toEqual(`${indexName}@${pipelineSuffix}`);
    expect(editLink.endsWith(`${indexName}@${pipelineSuffix}`)).toBe(true);
    expect(trackLink).toEqual(
      `entSearchContent-${ingestionMethod}-pipelines-customPipeline-editPipeline`
    );
    expect(processorCountBadge).toEqual(`${processorsCount} Processors`);
  });
});
