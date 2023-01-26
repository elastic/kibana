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

import { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';

import { DEFAULT_PIPELINE_NAME } from '../../../../../../../common/constants';

import { CustomPipelineItem } from './custom_pipeline_item';
import { CustomizeIngestPipelineItem } from './customize_pipeline_item';
import { DefaultPipelineItem } from './default_pipeline_item';
import { IngestPipelinesCard } from './ingest_pipelines_card';

const DEFAULT_VALUES = {
  // IndexViewLogic
  indexName: crawlerIndex.name,
  ingestionMethod: 'crawler',
  // FetchCustomPipelineApiLogic
  data: undefined,
  // PipelinesLogic
  canSetPipeline: true,
  hasIndexIngestionPipeline: false,
  index: crawlerIndex,
  pipelineName: DEFAULT_PIPELINE_NAME,
  pipelineState: {
    extract_binary_content: true,
    name: DEFAULT_PIPELINE_NAME,
    reduce_whitespace: true,
    run_ml_inference: false,
  },
  showModal: false,
};

describe('IngestPipelinesCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({ ...DEFAULT_VALUES });
  });
  it('renders with default ingest pipeline', () => {
    const wrapper = shallow(<IngestPipelinesCard />);
    expect(wrapper.find(DefaultPipelineItem)).toHaveLength(1);
    expect(wrapper.find(CustomizeIngestPipelineItem)).toHaveLength(1);
    expect(wrapper.find(CustomPipelineItem)).toHaveLength(0);
  });
  it('does not render customize cta with index ingest pipeline', () => {
    const pipelineName = crawlerIndex.name;
    const pipelines: Record<string, IngestPipeline | undefined> = {
      [pipelineName]: {},
      [`${pipelineName}@custom`]: {
        processors: [],
      },
    };
    setMockValues({
      ...DEFAULT_VALUES,
      data: pipelines,
      hasIndexIngestionPipeline: true,
      pipelineName,
      pipelineState: {
        ...DEFAULT_VALUES.pipelineState,
        name: pipelineName,
      },
    });

    const wrapper = shallow(<IngestPipelinesCard />);
    expect(wrapper.find(CustomizeIngestPipelineItem)).toHaveLength(0);
    expect(wrapper.find(DefaultPipelineItem)).toHaveLength(1);
    expect(wrapper.find(CustomPipelineItem)).toHaveLength(1);
  });
});
