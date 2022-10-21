/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiStepsHorizontal,
  EuiStepsHorizontalProps,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import {
  BACK_BUTTON_LABEL,
  CANCEL_BUTTON_LABEL,
  CONTINUE_BUTTON_LABEL,
} from '../../../../../shared/constants';
import { IndexNameLogic } from '../../index_name_logic';

import { IndexViewLogic } from '../../index_view_logic';

import { ConfigurePipeline } from './configure_pipeline';
import { AddInferencePipelineSteps, MLInferenceLogic } from './ml_inference_logic';
import { NoModelsPanel } from './no_models';
import { ReviewPipeline } from './review_pipeline';
import { TestPipeline } from './test_pipeline';

interface AddMLInferencePipelineModalProps {
  onClose: () => void;
}

export const AddMLInferencePipelineModal: React.FC<AddMLInferencePipelineModalProps> = ({
  onClose,
}) => {
  const { indexName } = useValues(IndexNameLogic);
  const { setIndexName } = useActions(MLInferenceLogic);
  useEffect(() => {
    setIndexName(indexName);
  }, [indexName]);

  return (
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h1>
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.title',
              {
                defaultMessage: 'Add an inference pipeline',
              }
            )}
          </h1>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <AddProcessorContent onClose={onClose} />
    </EuiModal>
  );
};

const AddProcessorContent: React.FC<AddMLInferencePipelineModalProps> = ({ onClose }) => {
  const { ingestionMethod } = useValues(IndexViewLogic);
  const {
    createErrors,
    supportedMLModels,
    isLoading,
    addInferencePipelineModal: { step },
  } = useValues(MLInferenceLogic);
  if (isLoading) {
    return (
      <EuiModalBody>
        <EuiLoadingSpinner size="xl" />
      </EuiModalBody>
    );
  }
  if (supportedMLModels === undefined || supportedMLModels?.length === 0) {
    return <NoModelsPanel />;
  }
  return (
    <>
      <EuiModalBody>
        {createErrors.length > 0 && (
          <>
            <EuiCallOut
              title={i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.createErrors',
                { defaultMessage: 'Error creating pipeline' }
              )}
              color="danger"
              iconType="alert"
            >
              {createErrors.map((message, i) => (
                <p key={`createError.${i}`}>{message}</p>
              ))}
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}
        <ModalSteps />
        {step === AddInferencePipelineSteps.Configuration && <ConfigurePipeline />}
        {step === AddInferencePipelineSteps.Test && <TestPipeline />}
        {step === AddInferencePipelineSteps.Review && <ReviewPipeline />}
      </EuiModalBody>
      <ModalFooter ingestionMethod={ingestionMethod} onClose={onClose} />
    </>
  );
};

const ModalSteps: React.FC = () => {
  const {
    addInferencePipelineModal: { step },
    isPipelineDataValid,
  } = useValues(MLInferenceLogic);
  const { setAddInferencePipelineStep } = useActions(MLInferenceLogic);
  const navSteps: EuiStepsHorizontalProps['steps'] = [
    {
      onClick: () => setAddInferencePipelineStep(AddInferencePipelineSteps.Configuration),
      status: isPipelineDataValid ? 'complete' : 'disabled',
      title: i18n.translate(
        'xpack.enterpriseSearch.content.indices.transforms.addInferencePipelineModal.steps.configure.title',
        {
          defaultMessage: 'Configure',
        }
      ),
    },
    {
      onClick: () => setAddInferencePipelineStep(AddInferencePipelineSteps.Test),
      status: isPipelineDataValid ? 'incomplete' : 'disabled',
      title: i18n.translate(
        'xpack.enterpriseSearch.content.indices.transforms.addInferencePipelineModal.steps.test.title',
        {
          defaultMessage: 'Test',
        }
      ),
    },
    {
      onClick: () => setAddInferencePipelineStep(AddInferencePipelineSteps.Review),
      status: isPipelineDataValid ? 'incomplete' : 'disabled',
      title: i18n.translate(
        'xpack.enterpriseSearch.content.indices.transforms.addInferencePipelineModal.steps.review.title',
        {
          defaultMessage: 'Review',
        }
      ),
    },
  ];
  switch (step) {
    case AddInferencePipelineSteps.Configuration:
      navSteps[0].status = isPipelineDataValid ? 'complete' : 'current';
      break;
    case AddInferencePipelineSteps.Test:
      navSteps[1].status = 'current';
      break;
    case AddInferencePipelineSteps.Review:
      navSteps[2].status = 'current';
      break;
  }
  return <EuiStepsHorizontal steps={navSteps} />;
};

const ModalFooter: React.FC<AddMLInferencePipelineModalProps & { ingestionMethod: string }> = ({
  ingestionMethod,
  onClose,
}) => {
  const { addInferencePipelineModal: modal, isPipelineDataValid } = useValues(MLInferenceLogic);
  const { createPipeline, setAddInferencePipelineStep } = useActions(MLInferenceLogic);

  let nextStep: AddInferencePipelineSteps | undefined;
  let previousStep: AddInferencePipelineSteps | undefined;
  switch (modal.step) {
    case AddInferencePipelineSteps.Test:
      nextStep = AddInferencePipelineSteps.Review;
      previousStep = AddInferencePipelineSteps.Configuration;
      break;
    case AddInferencePipelineSteps.Review:
      previousStep = AddInferencePipelineSteps.Test;
      break;
    case AddInferencePipelineSteps.Configuration:
      nextStep = AddInferencePipelineSteps.Test;
      break;
  }
  return (
    <EuiModalFooter>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          {previousStep !== undefined ? (
            <EuiButtonEmpty
              flush="both"
              iconType="arrowLeft"
              onClick={() => setAddInferencePipelineStep(previousStep as AddInferencePipelineSteps)}
            >
              {BACK_BUTTON_LABEL}
            </EuiButtonEmpty>
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-addMlInference-cancel`}
            onClick={onClose}
          >
            {CANCEL_BUTTON_LABEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {nextStep !== undefined ? (
            <EuiButton
              data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-addMlInference-continue`}
              iconType="arrowRight"
              iconSide="right"
              onClick={() => setAddInferencePipelineStep(nextStep as AddInferencePipelineSteps)}
              disabled={!isPipelineDataValid}
            >
              {CONTINUE_BUTTON_LABEL}
            </EuiButton>
          ) : (
            <EuiButton
              data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-addMlInference-create`}
              color="success"
              disabled={!isPipelineDataValid}
              onClick={createPipeline}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.transforms.addInferencePipelineModal.footer.create',
                {
                  defaultMessage: 'Create',
                }
              )}
            </EuiButton>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiModalFooter>
  );
};
