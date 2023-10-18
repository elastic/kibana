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
  EuiStepStatus,
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
import { UpdateMappings } from './update_mappings';

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
        <EuiSpacer size="m" />
        {step === AddInferencePipelineSteps.Configuration && <ConfigurePipeline />}
        {step === AddInferencePipelineSteps.Fields && <ConfigureFields />}
        {step === AddInferencePipelineSteps.Mappings && <UpdateMappings />}
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
  const { onAddInferencePipelineStepChange } = useActions(MLInferenceLogic);

  /**
   * Convenience function for determining the status of a step in the horizontal nav.
   * @param currentStep The current step in the pipeline.
   * @param otherStep The step to compare against.
   * @returns The status of the step.
   */
  const getStepStatus = (
    currentStep: AddInferencePipelineSteps,
    otherStep: AddInferencePipelineSteps
  ): EuiStepStatus =>
    currentStep > otherStep ? 'complete' : currentStep === otherStep ? 'current' : 'incomplete';

  const navSteps: EuiStepsHorizontalProps['steps'] = [
    {
      // Configure
      onClick: () => onAddInferencePipelineStepChange(AddInferencePipelineSteps.Configuration),
      status: step > AddInferencePipelineSteps.Configuration ? 'complete' : 'current',
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
        onAddInferencePipelineStepChange(AddInferencePipelineSteps.Fields);
      },
      status: isConfigureStepValid
        ? getStepStatus(step, AddInferencePipelineSteps.Fields)
        : 'disabled',
      title: i18n.translate(
        'xpack.enterpriseSearch.content.indices.transforms.addInferencePipelineModal.steps.fields.title',
        {
          defaultMessage: 'Fields',
        }
      ),
    },
    {
      // Mappings
      onClick: () => {
        if (!isPipelineDataValid) return;
        onAddInferencePipelineStepChange(AddInferencePipelineSteps.Mappings);
      },
      status: isPipelineDataValid
        ? getStepStatus(step, AddInferencePipelineSteps.Mappings)
        : 'disabled',
      title: i18n.translate(
        'xpack.enterpriseSearch.content.indices.transforms.addInferencePipelineModal.steps.updateMappings.title',
        {
          defaultMessage: 'Mappings',
        }
      ),
    },
    {
      // Test
      onClick: () => {
        if (!isPipelineDataValid) return;
        onAddInferencePipelineStepChange(AddInferencePipelineSteps.Test);
      },
      status: isPipelineDataValid
        ? getStepStatus(step, AddInferencePipelineSteps.Test)
        : 'disabled',
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
        onAddInferencePipelineStepChange(AddInferencePipelineSteps.Review);
      },
      status: isPipelineDataValid
        ? getStepStatus(step, AddInferencePipelineSteps.Review)
        : 'disabled',
      title: i18n.translate(
        'xpack.enterpriseSearch.content.indices.transforms.addInferencePipelineModal.steps.review.title',
        {
          defaultMessage: 'Review',
        }
      ),
    },
  ];

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
  const { attachPipeline, createPipeline, onAddInferencePipelineStepChange } =
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
      nextStep = AddInferencePipelineSteps.Mappings;
      previousStep = AddInferencePipelineSteps.Configuration;
      isContinueButtonEnabled = isPipelineDataValid;
      break;
    case AddInferencePipelineSteps.Mappings:
      nextStep = AddInferencePipelineSteps.Test;
      previousStep = AddInferencePipelineSteps.Fields;
      isContinueButtonEnabled = true;
      break;
    case AddInferencePipelineSteps.Test:
      nextStep = AddInferencePipelineSteps.Review;
      previousStep = AddInferencePipelineSteps.Mappings;
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
        <EuiButtonEmpty
          data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-addMlInference-cancel`}
          onClick={onClose}
        >
          {CANCEL_BUTTON_LABEL}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem />
      <EuiFlexItem grow={false}>
        {previousStep !== undefined ? (
          <EuiButtonEmpty
            flush="both"
            iconType="arrowLeft"
            onClick={() =>
              onAddInferencePipelineStepChange(previousStep as AddInferencePipelineSteps)
            }
          >
            {BACK_BUTTON_LABEL}
          </EuiButtonEmpty>
        ) : null}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {nextStep !== undefined ? (
          <EuiButton
            data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-addMlInference-continue`}
            iconType="arrowRight"
            iconSide="right"
            onClick={() => onAddInferencePipelineStepChange(nextStep as AddInferencePipelineSteps)}
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
