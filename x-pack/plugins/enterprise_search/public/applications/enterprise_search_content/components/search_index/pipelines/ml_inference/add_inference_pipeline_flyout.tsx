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

import { ConfigureFields } from './configure_fields';
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
              iconType="error"
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
        {step === AddInferencePipelineSteps.Fields && <ConfigureFields />}
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
    isConfigureStepValid,
    isPipelineDataValid,
  } = useValues(MLInferenceLogic);
  const { setAddInferencePipelineStep } = useActions(MLInferenceLogic);
  const navSteps: EuiStepsHorizontalProps['steps'] = [
    {
      // Configure
      onClick: () => setAddInferencePipelineStep(AddInferencePipelineSteps.Configuration),
      status: isConfigureStepValid ? 'complete' : 'disabled',
      title: i18n.translate(
        'xpack.enterpriseSearch.content.indices.transforms.addInferencePipelineModal.steps.configure.title',
        {
          defaultMessage: 'Configure',
        }
      ),
    },
    {
      // Fields
      onClick: () => {
        if (!isConfigureStepValid) return;
        setAddInferencePipelineStep(AddInferencePipelineSteps.Fields);
      },
      status: isConfigureStepValid ? (isPipelineDataValid ? 'complete' : 'incomplete') : 'disabled',
      title: i18n.translate(
        'xpack.enterpriseSearch.content.indices.transforms.addInferencePipelineModal.steps.fields.title',
        {
          defaultMessage: 'Fields',
        }
      ),
    },
    {
      // Test
      onClick: () => {
        if (!isPipelineDataValid) return;
        setAddInferencePipelineStep(AddInferencePipelineSteps.Test);
      },
      status: isPipelineDataValid ? 'incomplete' : 'disabled',
      title: i18n.translate(
        'xpack.enterpriseSearch.content.indices.transforms.addInferencePipelineModal.steps.test.title',
        {
          defaultMessage: 'Test (Optional)',
        }
      ),
    },
    {
      // Review
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
      navSteps[0].status = isConfigureStepValid ? 'complete' : 'current';
      break;
    case AddInferencePipelineSteps.Fields:
      navSteps[1].status = isPipelineDataValid ? 'complete' : 'current';
      break;
    case AddInferencePipelineSteps.Test:
      navSteps[2].status = 'current';
      break;
    case AddInferencePipelineSteps.Review:
      navSteps[3].status = 'current';
      break;
  }
  return <EuiStepsHorizontal steps={navSteps} />;
};

export const AddInferencePipelineFooter: React.FC<
  AddInferencePipelineFlyoutProps & { ingestionMethod: string }
> = ({ ingestionMethod, onClose }) => {
  const {
    addInferencePipelineModal: modal,
    isPipelineDataValid,
    isConfigureStepValid,
  } = useValues(MLInferenceLogic);
  const { attachPipeline, createPipeline, setAddInferencePipelineStep } =
    useActions(MLInferenceLogic);

  const attachExistingPipeline = Boolean(modal.configuration.existingPipeline);
  let nextStep: AddInferencePipelineSteps | undefined;
  let previousStep: AddInferencePipelineSteps | undefined;
  let isContinueButtonEnabled = false;
  switch (modal.step) {
    case AddInferencePipelineSteps.Configuration:
      nextStep = AddInferencePipelineSteps.Fields;
      isContinueButtonEnabled = isConfigureStepValid;
      break;
    case AddInferencePipelineSteps.Fields:
      nextStep = AddInferencePipelineSteps.Test;
      previousStep = AddInferencePipelineSteps.Configuration;
      isContinueButtonEnabled = isPipelineDataValid;
      break;
    case AddInferencePipelineSteps.Test:
      nextStep = AddInferencePipelineSteps.Review;
      previousStep = AddInferencePipelineSteps.Fields;
      isContinueButtonEnabled = true;
      break;
    case AddInferencePipelineSteps.Review:
      previousStep = AddInferencePipelineSteps.Test;
      isContinueButtonEnabled = true;
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
            disabled={!isContinueButtonEnabled}
            fill
          >
            {CONTINUE_BUTTON_LABEL}
          </EuiButton>
        ) : attachExistingPipeline ? (
          <EuiButton
            color="primary"
            data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-addMlInference-attach`}
            disabled={!isContinueButtonEnabled}
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
            disabled={!isContinueButtonEnabled}
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
