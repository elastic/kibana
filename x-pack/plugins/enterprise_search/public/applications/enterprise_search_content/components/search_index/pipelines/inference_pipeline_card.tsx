/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiTextColor,
  EuiTitle,
  EuiToolTip,
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
import { TrainedModelHealth } from './ml_model_health';
import { PipelinesLogic } from './pipelines_logic';

export const InferencePipelineCard: React.FC<InferencePipeline> = (pipeline) => {
  const { http } = useValues(HttpLogic);
  const { indexName } = useValues(IndexNameLogic);
  const { ingestionMethod } = useValues(IndexViewLogic);
  const [isPopOverOpen, setIsPopOverOpen] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const { deleteMlPipeline, detachMlPipeline } = useActions(PipelinesLogic);
  const showConfirmDeleteModal = () => {
    setShowConfirmDelete(true);
    setIsPopOverOpen(false);
  };
  const { pipelineName, types: modelTypes } = pipeline;
  const modelType = getMLType(modelTypes);
  const modelTitle = getModelDisplayTitle(modelType);
  const actionButton = (
    <EuiButtonEmpty
      iconSide="right"
      flush="both"
      iconType="boxesVertical"
      onClick={() => setIsPopOverOpen(!isPopOverOpen)}
    >
      {i18n.translate('xpack.enterpriseSearch.inferencePipelineCard.actionButton', {
        defaultMessage: 'Actions',
      })}
    </EuiButtonEmpty>
  );

  return (
    <EuiPanel color="subdued">
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h4>{modelTitle ?? pipelineName}</h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPopover
                button={actionButton}
                isOpen={isPopOverOpen}
                closePopover={() => setIsPopOverOpen(false)}
              >
                <EuiPopoverTitle paddingSize="m">
                  {i18n.translate('xpack.enterpriseSearch.inferencePipelineCard.action.title', {
                    defaultMessage: 'Actions',
                  })}
                </EuiPopoverTitle>
                <EuiFlexGroup direction="column" gutterSize="none">
                  <EuiFlexItem>
                    <div>
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
                        {i18n.translate(
                          'xpack.enterpriseSearch.inferencePipelineCard.action.view',
                          { defaultMessage: 'View in Stack Management' }
                        )}
                      </EuiButtonEmpty>
                    </div>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <div>
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
                        {i18n.translate(
                          'xpack.enterpriseSearch.inferencePipelineCard.action.detach',
                          { defaultMessage: 'Detach pipeline' }
                        )}
                      </EuiButtonEmpty>
                    </div>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <div>
                      <DeleteInferencePipelineButton
                        data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-inferencePipeline-deletePipeline`}
                        onClick={showConfirmDeleteModal}
                        pipeline={pipeline}
                      />
                    </div>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd">
                {modelTitle && (
                  <EuiFlexItem>
                    <EuiTextColor color="subdued">{pipelineName}</EuiTextColor>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <TrainedModelHealth
                    modelState={pipeline.modelState}
                    modelStateReason={pipeline.modelStateReason}
                  />
                </EuiFlexItem>
                {pipeline.modelState === TrainedModelState.NotDeployed && (
                  <EuiFlexItem grow={false} style={{ paddingRight: '1rem' }}>
                    <EuiToolTip
                      position="top"
                      content={i18n.translate(
                        'xpack.enterpriseSearch.inferencePipelineCard.modelState.notDeployed.fixLink',
                        { defaultMessage: 'Fix issue in Trained Models' }
                      )}
                    >
                      <EuiButtonIcon
                        data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-inferencePipeline-fixIssueInTrainedModels`}
                        href={http.basePath.prepend(ML_MANAGE_TRAINED_MODELS_PATH)}
                        display="base"
                        size="xs"
                        iconType="wrench"
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="xs">
                    <EuiFlexItem>
                      <span>
                        <EuiBadge color="hollow">{modelType}</EuiBadge>
                      </span>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
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
    </EuiPanel>
  );
};
