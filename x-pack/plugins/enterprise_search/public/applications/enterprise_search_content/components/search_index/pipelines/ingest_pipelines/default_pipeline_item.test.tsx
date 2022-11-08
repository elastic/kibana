/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockPipelineState } from '../../../../__mocks__/pipeline.mock';
import { indices } from '../../../../__mocks__/search_indices.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBadge, EuiButtonEmpty } from '@elastic/eui';

import { CurlRequest } from '../../components/curl_request/curl_request';

import { DefaultPipelineItem } from './default_pipeline_item';

describe('DefaultPipelineItem', () => {
  it('renders default pipeline item for ingestion indices', () => {
    const index = indices[1];
    const mockOpenModal = jest.fn();
    const ingestionMethod = 'connector';
    const wrapper = shallow(
      <DefaultPipelineItem
        index={index}
        indexName={index.name}
        ingestionMethod={ingestionMethod}
        openModal={mockOpenModal}
        pipelineName={mockPipelineState.name}
        pipelineState={mockPipelineState}
      />
    );

    const title = wrapper.find('h4').text();
    const settingsButton = wrapper.find(EuiButtonEmpty);
    const curlRequest = wrapper.find(CurlRequest);
    const badge = wrapper.find(EuiBadge);

    expect(title).toEqual(mockPipelineState.name);
    expect(settingsButton.prop('data-telemetry-id')).toEqual(
      `entSearchContent-${ingestionMethod}-pipelines-ingestPipelines-settings`
    );
    settingsButton.simulate('click');
    expect(mockOpenModal).toHaveBeenCalledTimes(1);
    expect(curlRequest.length).toEqual(0);
    expect(badge.render().text()).toEqual('Managed');
  });

  it('renders default pipeline item for api indices', () => {
    const index = indices[0];
    const mockOpenModal = jest.fn();
    const ingestionMethod = 'api';
    const wrapper = shallow(
      <DefaultPipelineItem
        index={index}
        indexName={index.name}
        ingestionMethod={ingestionMethod}
        openModal={mockOpenModal}
        pipelineName={mockPipelineState.name}
        pipelineState={mockPipelineState}
      />
    );

    const title = wrapper.find('h4').text();
    const settingsButton = wrapper.find(EuiButtonEmpty);
    const curlRequest = wrapper.find(CurlRequest);
    const badge = wrapper.find(EuiBadge);

    expect(title).toEqual(mockPipelineState.name);
    expect(settingsButton.prop('data-telemetry-id')).toEqual(
      `entSearchContent-${ingestionMethod}-pipelines-ingestPipelines-settings`
    );
    settingsButton.simulate('click');
    expect(mockOpenModal).toHaveBeenCalledTimes(1);
    expect(curlRequest.prop('document')).toBeDefined();
    expect(curlRequest.prop('indexName')).toEqual(index.name);
    expect(curlRequest.prop('pipeline')).toEqual({
      ...mockPipelineState,
      name: mockPipelineState.name,
    });

    expect(badge.render().text()).toEqual('Managed');
  });
});
