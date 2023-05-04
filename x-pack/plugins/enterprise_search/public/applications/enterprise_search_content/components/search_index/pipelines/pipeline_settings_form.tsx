/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { IngestPipelineParams } from '../../../../../../common/types/connectors';
import { SettingsCheckableCard } from '../../shared/settings_checkable_card/settings_checkable_card';

interface PipelineSettingsFormProps {
  ingestionMethod: string;
  pipeline: IngestPipelineParams;
  setPipeline: (pipeline: IngestPipelineParams) => void;
}

export const PipelineSettingsForm: React.FC<PipelineSettingsFormProps> = ({
  ingestionMethod,
  setPipeline,
  pipeline,
}) => {
  const {
    extract_binary_content: extractBinaryContent,
    reduce_whitespace: reduceWhitespace,
    run_ml_inference: runMLInference,
  } = pipeline;
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <SettingsCheckableCard
          data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-ingestPipelines-extractBinaryContent`}
          description={i18n.translate(
            'xpack.enterpriseSearch.content.index.pipelines.settings.extractBinaryDescription',
            {
              defaultMessage: 'Extract content from images and PDF files',
            }
          )}
          label={i18n.translate(
            'xpack.enterpriseSearch.content.index.pipelines.settings.extractBinaryLabel',
            {
              defaultMessage: 'Content extraction',
            }
          )}
          onChange={() =>
            setPipeline({
              ...pipeline,
              extract_binary_content: !pipeline.extract_binary_content,
            })
          }
          checked={extractBinaryContent}
          id="ingestPipelineExtractBinaryContent"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <SettingsCheckableCard
          data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-ingestPipelines-reduceWhitespace`}
          id="ingestPipelineReduceWhitespace"
          checked={reduceWhitespace}
          description={i18n.translate(
            'xpack.enterpriseSearch.content.index.pipelines.settings.reduceWhitespaceDescription',
            {
              defaultMessage: 'Trim extra whitespace from your documents automatically',
            }
          )}
          label={i18n.translate(
            'xpack.enterpriseSearch.content.index.pipelines.settings.reduceWhitespaceLabel',
            {
              defaultMessage: 'Reduce whitespace',
            }
          )}
          onChange={() =>
            setPipeline({ ...pipeline, reduce_whitespace: !pipeline.reduce_whitespace })
          }
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <SettingsCheckableCard
          data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-ingestPipelines-runMlInference`}
          id="ingestPipelineRunMlInference"
          checked={runMLInference}
          description={i18n.translate(
            'xpack.enterpriseSearch.content.index.pipelines.settings.runMlInferenceDescrition',
            {
              defaultMessage: 'Enhance your data using compatible trained ML models',
            }
          )}
          label={i18n.translate(
            'xpack.enterpriseSearch.content.index.pipelines.settings.mlInferenceLabel',
            {
              defaultMessage: 'ML Inference Pipelines',
            }
          )}
          onChange={() =>
            setPipeline({ ...pipeline, run_ml_inference: !pipeline.run_ml_inference })
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
