/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGrid,
  EuiFlexItem,
  EuiTitle,
  EuiPanel,
  EuiAccordion,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMlKibana } from '../../../contexts/kibana';
import { ModelItem } from '../models_list';
import { ProcessorsStats } from './expanded_row';

export type IngestStatsResponse = Exclude<ModelItem['stats'], undefined>['ingest'];

interface ModelPipelinesProps {
  pipelines: ModelItem['pipelines'];
  ingestStats: IngestStatsResponse;
}

export const ModelPipelines: FC<ModelPipelinesProps> = ({ pipelines, ingestStats }) => {
  const {
    services: { share },
  } = useMlKibana();

  const pipelineNames = Object.keys(pipelines ?? ingestStats?.pipelines ?? {});

  if (!pipelineNames.length) return null;

  return (
    <>
      {pipelineNames.map((pipelineName, i) => {
        // Expand first 3 pipelines by default
        const initialIsOpen = i <= 2;

        const pipelineDefinition = pipelines?.[pipelineName];

        return (
          <>
            <EuiAccordion
              key={pipelineName}
              id={pipelineName}
              buttonContent={
                <EuiTitle size="xs">
                  <h5>{pipelineName}</h5>
                </EuiTitle>
              }
              extraAction={
                pipelineDefinition ? (
                  <EuiButtonEmpty
                    data-test-subj={`mlTrainedModelPipelineEditButton_${pipelineName}`}
                    onClick={() => {
                      const locator = share.url.locators.get('INGEST_PIPELINES_APP_LOCATOR');
                      if (!locator) return;
                      locator.navigate({
                        page: 'pipeline_edit',
                        pipelineId: pipelineName,
                        absolute: true,
                      });
                    }}
                    iconType={'documentEdit'}
                    iconSide="left"
                  >
                    <FormattedMessage
                      id="xpack.ml.trainedModels.modelsList.expandedRow.editPipelineLabel"
                      defaultMessage="Edit"
                    />
                  </EuiButtonEmpty>
                ) : undefined
              }
              paddingSize="l"
              initialIsOpen={initialIsOpen}
            >
              <EuiFlexGrid columns={2}>
                {ingestStats?.pipelines ? (
                  <EuiFlexItem data-test-subj={`mlTrainedModelPipelineIngestStats_${pipelineName}`}>
                    <EuiPanel>
                      <EuiTitle size={'xxs'}>
                        <h6>
                          <FormattedMessage
                            id="xpack.ml.trainedModels.modelsList.expandedRow.ingestStatsTitle"
                            defaultMessage="Ingest stats"
                          />
                        </h6>
                      </EuiTitle>

                      <ProcessorsStats stats={ingestStats!.pipelines[pipelineName].processors} />
                    </EuiPanel>
                  </EuiFlexItem>
                ) : null}

                {pipelineDefinition ? (
                  <EuiFlexItem data-test-subj={`mlTrainedModelPipelineDefinition_${pipelineName}`}>
                    <EuiPanel>
                      <EuiTitle size={'xxs'}>
                        <h6>
                          <FormattedMessage
                            id="xpack.ml.trainedModels.modelsList.expandedRow.processorsTitle"
                            defaultMessage="Definition"
                          />
                        </h6>
                      </EuiTitle>
                      <EuiCodeBlock
                        language="json"
                        fontSize="m"
                        paddingSize="m"
                        overflowHeight={300}
                        isCopyable
                      >
                        {JSON.stringify(pipelineDefinition, null, 2)}
                      </EuiCodeBlock>
                    </EuiPanel>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGrid>
            </EuiAccordion>
          </>
        );
      })}
    </>
  );
};
