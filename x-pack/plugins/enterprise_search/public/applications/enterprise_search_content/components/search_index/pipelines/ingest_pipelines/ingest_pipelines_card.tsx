/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { KibanaLogic } from '../../../../../shared/kibana';

import { LicensingLogic } from '../../../../../shared/licensing';
import { CreateCustomPipelineApiLogic } from '../../../../api/index/create_custom_pipeline_api_logic';
import { FetchCustomPipelineApiLogic } from '../../../../api/index/fetch_custom_pipeline_api_logic';
import { IndexViewLogic } from '../../index_view_logic';

import { PipelinesLogic } from '../pipelines_logic';

import { CustomPipelineItem } from './custom_pipeline_item';
import { DefaultPipelineItem } from './default_pipeline_item';
import { IngestPipelineModal } from './ingest_pipeline_modal';

export const IngestPipelinesCard: React.FC = () => {
  const { indexName, ingestionMethod } = useValues(IndexViewLogic);

  const { canSetPipeline, index, pipelineName, pipelineState, showModal } =
    useValues(PipelinesLogic);
  const { closeModal, openModal, setPipelineState, savePipeline } = useActions(PipelinesLogic);
  const { makeRequest: fetchCustomPipeline } = useActions(FetchCustomPipelineApiLogic);
  const { makeRequest: createCustomPipeline } = useActions(CreateCustomPipelineApiLogic);
  const { data: customPipelines } = useValues(FetchCustomPipelineApiLogic);
  const { isCloud } = useValues(KibanaLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const isGated = !isCloud && !hasPlatinumLicense;
  const customPipeline = customPipelines ? customPipelines[`${indexName}@custom`] : undefined;

  useEffect(() => {
    fetchCustomPipeline({ indexName });
  }, [indexName]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {showModal && (
        <IngestPipelineModal
          closeModal={closeModal}
          createCustomPipelines={() => createCustomPipeline({ indexName })}
          displayOnly={!canSetPipeline}
          indexName={indexName}
          ingestionMethod={ingestionMethod}
          isGated={isGated}
          isLoading={false}
          pipeline={{ ...pipelineState, name: pipelineName }}
          savePipeline={savePipeline}
          setPipeline={setPipelineState}
        />
      )}
      <EuiFlexItem>
        <EuiPanel color="subdued">
          <DefaultPipelineItem
            index={index}
            openModal={openModal}
            pipelineName={pipelineName}
            ingestionMethod={ingestionMethod}
            indexName={indexName}
            pipelineState={pipelineState}
          />
        </EuiPanel>
      </EuiFlexItem>
      {customPipeline && (
        <EuiFlexItem>
          <EuiPanel color="primary">
            <CustomPipelineItem
              indexName={indexName}
              ingestionMethod={ingestionMethod}
              pipelineSuffix="custom"
              processorsCount={customPipeline.processors?.length ?? 0}
            />
          </EuiPanel>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
