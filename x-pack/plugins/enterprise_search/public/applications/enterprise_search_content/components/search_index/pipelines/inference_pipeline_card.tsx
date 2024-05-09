/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiText,
  EuiTitle,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { InferencePipeline, TrainedModelState } from '../../../../../../common/types/pipelines';
import { CANCEL_BUTTON_LABEL, DELETE_BUTTON_LABEL } from '../../../../shared/constants';
import { HttpLogic } from '../../../../shared/http';
import { ML_MANAGE_TRAINED_MODELS_PATH } from '../../../routes';
import { getMLType, getModelDisplayTitle } from '../../shared/ml_inference/utils';
import { IndexNameLogic } from '../index_name_logic';

import { IndexViewLogic } from '../index_view_logic';

import { DeleteInferencePipelineButton } from './delete_inference_pipeline_button';
import { MODEL_REDACTED_VALUE } from './ml_inference/utils';
import { TrainedModelHealth } from './ml_model_health';
import { MLModelTypeBadge } from './ml_model_type_badge';
import { PipelinesLogic } from './pipelines_logic';

export const TrainedModelHealthPopover: React.FC<InferencePipeline> = (pipeline) => {
  const { http } = useValues(HttpLogic);
  const { indexName } = useValues(IndexNameLogic);
  const { ingestionMethod } = useValues(IndexViewLogic);

  const { deleteMlPipeline, detachMlPipeline } = useActions(PipelinesLogic);

  const [isPopOverOpen, setIsPopOverOpen] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const { pipelineName } = pipeline;

  const actionButton = (
    <EuiButtonEmpty
      iconSide="right"
      flush="both"
      iconType="boxesHorizontal"
      onClick={() => setIsPopOverOpen(!isPopOverOpen)}
    >
      <TrainedModelHealth
        modelState={pipeline.modelState}
        modelStateReason={pipeline.modelStateReason}
      />
    </EuiButtonEmpty>
  );

  const showConfirmDeleteModal = () => {
    setShowConfirmDelete(true);
    setIsPopOverOpen(false);
  };

  return (
    <>
      <EuiPopover
        button={actionButton}
        isOpen={isPopOverOpen}
        closePopover={() => setIsPopOverOpen(false)}
      >
        <EuiFlexGroup direction="column" gutterSize="none">
          {pipeline.modelState === TrainedModelState.NotDeployed && (
            <EuiFlexItem>
              <span>
                <EuiButtonEmpty
                  data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-inferencePipeline-fixIssueInTrainedModels`}
                  size="s"
                  flush="both"
                  iconType="wrench"
                  color="text"
                  href={http.basePath.prepend(ML_MANAGE_TRAINED_MODELS_PATH)}
                >
                  {i18n.translate(
                    'xpack.enterpriseSearch.inferencePipelineCard.modelState.notDeployed.fixLink',
                    {
                      defaultMessage: 'Fix issue in Trained Models',
                    }
                  )}
                </EuiButtonEmpty>
              </span>
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <span>
              <EuiButtonEmpty
                data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-inferencePipeline-stackManagement`}
                size="s"
                flush="both"
                iconType="eye"
                color="text"
                href={http.basePath.prepend(
                  `/app/management/ingest/ingest_pipelines/?pipeline=${pipelineName}`
                )}
              >
                {i18n.translate('xpack.enterpriseSearch.inferencePipelineCard.action.view', {
                  defaultMessage: 'View in Stack Management',
                })}
              </EuiButtonEmpty>
            </span>
          </EuiFlexItem>
          <EuiFlexItem>
            <span>
              <EuiButtonEmpty
                data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-inferencePipeline-detachPipeline`}
                size="s"
                flush="both"
                iconType="unlink"
                color="text"
                onClick={() => {
                  detachMlPipeline({ indexName, pipelineName });
                  setIsPopOverOpen(false);
                }}
              >
                {i18n.translate('xpack.enterpriseSearch.inferencePipelineCard.action.detach', {
                  defaultMessage: 'Detach pipeline',
                })}
              </EuiButtonEmpty>
            </span>
          </EuiFlexItem>
          <EuiFlexItem>
            <span>
              <DeleteInferencePipelineButton
                data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-inferencePipeline-deletePipeline`}
                onClick={showConfirmDeleteModal}
                pipeline={pipeline}
              />
            </span>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopover>

      {showConfirmDelete && (
        <EuiConfirmModal
          onCancel={() => setShowConfirmDelete(false)}
          onConfirm={() => {
            setShowConfirmDelete(false);
            deleteMlPipeline({
              indexName,
              pipelineName,
            });
          }}
          title={i18n.translate(
            'xpack.enterpriseSearch.inferencePipelineCard.deleteConfirm.title',
            { defaultMessage: 'Delete Pipeline' }
          )}
          buttonColor="danger"
          cancelButtonText={CANCEL_BUTTON_LABEL}
          confirmButtonText={DELETE_BUTTON_LABEL}
          defaultFocusedButton="confirm"
          maxWidth
        >
          <EuiText>
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.inferencePipelineCard.deleteConfirm.description',
                {
                  defaultMessage:
                    'You are removing the pipeline "{pipelineName}" from the Machine Learning Inference Pipeline and deleting it.',
                  values: {
                    pipelineName,
                  },
                }
              )}
            </p>
          </EuiText>
        </EuiConfirmModal>
      )}
    </>
  );
};

export const InferencePipelineCard: React.FC<InferencePipeline> = (pipeline) => {
  const { modelId, pipelineName, types: modelTypes } = pipeline;
  const modelIdDisplay = modelId && modelId.length > 0 ? modelId : MODEL_REDACTED_VALUE;
  const modelType = getMLType(modelTypes);
  const modelTitle = getModelDisplayTitle(modelType);
  const isSmallScreen = useIsWithinMaxBreakpoint('s');

  return (
    <EuiPanel color="subdued">
      <EuiFlexGroup alignItems="center" gutterSize={isSmallScreen ? 'xs' : undefined}>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h4>{pipelineName ?? modelTitle}</h4>
              </EuiTitle>
            </EuiFlexItem>
            {modelTitle && (
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" color="subdued">
                      {modelIdDisplay}
                    </EuiText>
                  </EuiFlexItem>
                  {modelId && modelId.length > 0 && (
                    <EuiFlexItem>
                      <span>
                        <MLModelTypeBadge type={modelType} />
                      </span>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
            {pipeline.sourceFields && pipeline.sourceFields.length > 0 && (
              <EuiFlexItem>
                <EuiText size="s">{pipeline.sourceFields.join(', ')}</EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <TrainedModelHealthPopover {...pipeline} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
