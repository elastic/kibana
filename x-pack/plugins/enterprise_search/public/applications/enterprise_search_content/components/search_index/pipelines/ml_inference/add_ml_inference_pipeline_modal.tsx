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
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { IndexNameLogic } from '../../index_name_logic';

import { ConfigurePipeline } from './configure_pipeline';
import { MLInferenceLogic, AddInferencePipelineModal } from './ml_inference_logic';
import { NoModelsPanel } from './no_models';

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

const isProcessorConfigurationInvalid = ({ configuration }: AddInferencePipelineModal): boolean => {
  const { pipelineName, modelID, sourceField } = configuration;
  return pipelineName.trim().length === 0 || modelID.length === 0 || sourceField.length === 0;
};

const AddProcessorContent: React.FC<AddMLInferencePipelineModalProps> = ({ onClose }) => {
  const { addInferencePipelineModal, createErrors, supportedMLModels, isLoading } =
    useValues(MLInferenceLogic);
  const { createPipeline } = useActions(MLInferenceLogic);
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
        <ConfigurePipeline />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.footer.cancel',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              color="success"
              disabled={isProcessorConfigurationInvalid(addInferencePipelineModal)}
              onClick={createPipeline}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.footer.create',
                {
                  defaultMessage: 'Create',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </>
  );
};
