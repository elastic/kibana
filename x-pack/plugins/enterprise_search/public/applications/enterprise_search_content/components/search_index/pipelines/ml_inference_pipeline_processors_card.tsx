/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { InferencePipeline } from '../../../../../../common/types/pipelines';
import { IndexNameLogic } from '../index_name_logic';

import { InferencePipelineCard } from './inference_pipeline_card';
import { PipelinesLogic } from './pipelines_logic';

export const MlInferencePipelineProcessorsCard: React.FC = () => {
  const { indexName } = useValues(IndexNameLogic);
  const { mlInferencePipelineProcessors: inferencePipelines } = useValues(PipelinesLogic);
  const { fetchMlInferenceProcessors } = useActions(PipelinesLogic);
  useEffect(() => {
    fetchMlInferenceProcessors({ indexName });
  }, [indexName]);

  if (inferencePipelines === undefined) return null;
  if (inferencePipelines.length === 0) return null;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {inferencePipelines.map((item: InferencePipeline, index: number) => (
        <EuiFlexItem key={`${index}-${item.pipelineName}`}>
          <InferencePipelineCard {...item} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
