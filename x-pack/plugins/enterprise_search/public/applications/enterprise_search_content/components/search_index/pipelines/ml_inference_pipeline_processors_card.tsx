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
import { AddMLInferencePipelineButton } from './ml_inference/add_ml_inference_button';
import { TextExpansionCallOut } from './ml_inference/text_expansion_callout';
import { PipelinesLogic } from './pipelines_logic';

export const MlInferencePipelineProcessorsCard: React.FC = () => {
  const { indexName } = useValues(IndexNameLogic);
  const { mlInferencePipelineProcessors: inferencePipelines } = useValues(PipelinesLogic);
  const { fetchMlInferenceProcessors, openAddMlInferencePipelineModal } =
    useActions(PipelinesLogic);
  useEffect(() => {
    fetchMlInferenceProcessors({ indexName });
  }, [indexName]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <TextExpansionCallOut dismissable />
      <EuiFlexItem>
        <AddMLInferencePipelineButton onClick={() => openAddMlInferencePipelineModal()} />
      </EuiFlexItem>
      {inferencePipelines?.map((item: InferencePipeline, index: number) => (
        <EuiFlexItem key={`${index}-${item.pipelineName}`}>
          <InferencePipelineCard {...item} />
        </EuiFlexItem>
      )) ?? null}
    </EuiFlexGroup>
  );
};
