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
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiStepsHorizontal,
  EuiStepsHorizontalProps,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
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
import { MLInferenceLogic } from './ml_inference_logic';
import { NoModelsPanel } from './no_models';
import { ReviewPipeline } from './review_pipeline';
import { TestPipeline } from './test_pipeline';
import { AddInferencePipelineSteps } from './types';

import './add_inference_pipeline_flyout.scss';

export interface AddInferencePipelineFlyoutProps {
  onClose: () => void;
}

export const AddInferencePipelineFlyout = (props: AddInferencePipelineFlyoutProps) => {
  const { indexName } = useValues(IndexNameLogic);
  const { setIndexName } = useActions(MLInferenceLogic);
  useEffect(() => {
    setIndexName(indexName);
  }, [indexName]);

  return (
    <EuiFlyout onClose={props.onClose} className="enterpriseSearchInferencePipelineFlyout" size="l">
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h3>
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.title',
              {
                defaultMessage: 'Add an inference pipeline',
              }
            )}
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <AddInferencePipelineContent {...props} />
    </EuiFlyout>
  );
};

export const AddInferencePipelineContent = ({ onClose }: AddInferencePipelineFlyoutProps) => {
  const { ingestionMethod } = useValues(IndexViewLogic);
  const {
    createErrors,
    supportedMLModels,
    isLoading,
    addInferencePipelineModal: { step },
  } = useValues(MLInferenceLogic);

  // Using the value of create errors to reduce unnecessary hook calls
  const createErrorsHookDep = createErrors.join('|');
  useEffect(() => {
    if (createErrors.length === 0) return;
    const flyoutOverflow = document.getElementsByClassName('euiFlyoutBody__overflow');
    if (flyoutOverflow.length === 0) return;
    flyoutOverflow[0].scrollTop = 0;
  }, [createErrorsHookDep]);

  if (isLoading) {
    return (
      <EuiFlyoutBody>
        <EuiLoadingSpinner size="xl" />
      </EuiFlyoutBody>
    );
  }
  if (supportedMLModels.length === 0) {
    return <NoModelsPanel />;
  }

  return (
    <>
      <EuiFlyoutBody>
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
        <AddInferencePipelineHorizontalSteps />
        {step === AddInferencePipelineSteps.Configuration && <ConfigurePipeline />}
        {step === AddInferencePipelineSteps.Test && <TestPipeline />}
        {step === AddInferencePipelineSteps.Review && <ReviewPipeline />}
      </EuiFlyoutBody>
      <EuiFlyoutFooter className="enterpriseSearchInferencePipelineFlyoutFooter">
        <AddInferencePipelineFooter onClose={onClose} ingestionMethod={ingestionMethod} />
      </EuiFlyoutFooter>
    </>
  );
};

export const AddInferencePipelineHorizontalSteps: React.FC = () => {
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
      onClick: () => {
        if (!isPipelineDataValid) return;
        setAddInferencePipelineStep(AddInferencePipelineSteps.Test);
      },
      status: isPipelineDataValid ? 'incomplete' : 'disabled',
      title: i18n.translate(
        'xpack.enterpriseSearch.content.indices.transforms.addInferencePipelineModal.steps.test.title',
        {
          defaultMessage: 'Test',
        }
      ),
    },
    {
      onClick: () => {
        if (!isPipelineDataValid) return;
        setAddInferencePipelineStep(AddInferencePipelineSteps.Review);
      },
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

export const AddInferencePipelineFooter: React.FC<
  AddInferencePipelineFlyoutProps & { ingestionMethod: string }
> = ({ ingestionMethod, onClose }) => {
  const { addInferencePipelineModal: modal, isPipelineDataValid } = useValues(MLInferenceLogic);
  const { attachPipeline, createPipeline, setAddInferencePipelineStep } =
    useActions(MLInferenceLogic);

  const attachExistingPipeline = Boolean(modal.configuration.existingPipeline);
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
            fill
          >
            {CONTINUE_BUTTON_LABEL}
          </EuiButton>
        ) : attachExistingPipeline ? (
          <EuiButton
            color="primary"
            data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-addMlInference-attach`}
            disabled={!isPipelineDataValid}
            fill
            onClick={attachPipeline}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.transforms.addInferencePipelineModal.footer.attach',
              {
                defaultMessage: 'Attach',
              }
            )}
          </EuiButton>
        ) : (
          <EuiButton
            color="success"
            data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-addMlInference-create`}
            disabled={!isPipelineDataValid}
            fill
            onClick={createPipeline}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.transforms.addInferencePipelineModal.footer.create',
              {
                defaultMessage: 'Create pipeline',
              }
            )}
          </EuiButton>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
