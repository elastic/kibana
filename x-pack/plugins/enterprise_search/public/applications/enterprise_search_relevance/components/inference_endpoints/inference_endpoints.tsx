/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useActions, useValues } from 'kea';

import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { InferenceFlyoutWrapper } from '@kbn/inference_integration_flyout/components/inference_flyout_wrapper';
import { ModelConfig } from '@kbn/inference_integration_flyout/types';
import { extractErrorProperties } from '@kbn/ml-error-utils';
import { TrainedModelConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';
import { SUPPORTED_PYTORCH_TASKS, TRAINED_MODEL_TYPE } from '@kbn/ml-trained-models-utils';

import { docLinks } from '../../../shared/doc_links';
import { KibanaLogic } from '../../../shared/kibana';

import { TabularPage } from './all_inference_endpoints/tabular_page';
import { EmptyPromptPage } from './empty_prompt_page';
import { InferenceEndpointsLogic } from './inference_endpoints_logic';

const inferenceEndpointsBreadcrumbs = [
  i18n.translate('xpack.enterpriseSearch.relevance.inferenceEndpoints.breadcrumb', {
    defaultMessage: 'Inference Endpoints',
  }),
];

const addEndpointLabel = i18n.translate(
  'xpack.enterpriseSearch.relevance.inferenceEndpoints.newInferenceEndpointButtonLabel',
  {
    defaultMessage: 'Add endpoint',
  }
);

export const InferenceEndpoints: React.FC = () => {
  const { ml } = useValues(KibanaLogic);
  const { fetchInferenceEndpoints } = useActions(InferenceEndpointsLogic);
  const { inferenceEndpoints } = useValues(InferenceEndpointsLogic);
  const [isInferenceFlyoutVisible, setIsInferenceFlyoutVisible] = useState<boolean>(false);
  const [inferenceAddError, setInferenceAddError] = useState<string | undefined>(undefined);
  const [isCreateInferenceApiLoading, setIsCreateInferenceApiLoading] = useState(false);
  const [availableTrainedModels, setAvailableTrainedModels] = useState<
    TrainedModelConfigResponse[]
  >([]);

  const [inferenceEndpointError, setInferenceEndpointError] = useState<string | undefined>(
    undefined
  );
  const onInferenceEndpointChange = async () => {};
  const onSaveInferenceCallback = useCallback(
    async (inferenceId: string, taskType: InferenceTaskType, modelConfig: ModelConfig) => {
      setIsCreateInferenceApiLoading(true);
      try {
        await ml?.mlApi?.inferenceModels?.createInferenceEndpoint(
          inferenceId,
          taskType,
          modelConfig
        );
        setIsInferenceFlyoutVisible(!isInferenceFlyoutVisible);
        setIsCreateInferenceApiLoading(false);
        setInferenceAddError(undefined);
      } catch (error) {
        const errorObj = extractErrorProperties(error);
        setInferenceAddError(errorObj.message);
        setIsCreateInferenceApiLoading(false);
      }
    },
    [isInferenceFlyoutVisible, ml]
  );

  const onFlyoutClose = useCallback(() => {
    setInferenceAddError(undefined);
    setIsInferenceFlyoutVisible(!isInferenceFlyoutVisible);
  }, [isInferenceFlyoutVisible]);

  useEffect(() => {
    fetchInferenceEndpoints();
  }, []);

  useEffect(() => {
    const fetchAvailableTrainedModels = async () => {
      setAvailableTrainedModels((await ml?.mlApi?.trainedModels?.getTrainedModels()) ?? []);
    };
    fetchAvailableTrainedModels();
  }, [ml]);

  const trainedModels = useMemo(() => {
    const availableTrainedModelsList = availableTrainedModels
      .filter(
        (model: TrainedModelConfigResponse) =>
          model.model_type === TRAINED_MODEL_TYPE.PYTORCH &&
          (model?.inference_config
            ? Object.keys(model.inference_config).includes(SUPPORTED_PYTORCH_TASKS.TEXT_EMBEDDING)
            : {})
      )
      .map((model: TrainedModelConfigResponse) => model.model_id);

    return availableTrainedModelsList;
  }, [availableTrainedModels]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        {inferenceEndpoints.length === 0 ? (
          <EmptyPromptPage
            addEndpointLabel={addEndpointLabel}
            breadcrumbs={inferenceEndpointsBreadcrumbs}
            setIsInferenceFlyoutVisible={setIsInferenceFlyoutVisible}
          />
        ) : (
          <TabularPage
            addEndpointLabel={addEndpointLabel}
            breadcrumbs={inferenceEndpointsBreadcrumbs}
            setIsInferenceFlyoutVisible={setIsInferenceFlyoutVisible}
            inferenceEndpoints={inferenceEndpoints}
          />
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {isInferenceFlyoutVisible && (
          <InferenceFlyoutWrapper
            errorCallout={
              inferenceAddError && (
                <EuiFlexItem grow={false}>
                  <EuiCallOut
                    color="danger"
                    data-test-subj="addInferenceError"
                    iconType="error"
                    title={i18n.translate(
                      'xpack.enterpriseSearch.relevance.inferenceEndpoints.inferenceId.errorTitle',
                      {
                        defaultMessage: 'Error adding inference endpoint',
                      }
                    )}
                  >
                    <EuiText>
                      <FormattedMessage
                        id="xpack.enterpriseSearch.relevance.inferenceEndpoints.inferenceId.errorDescription"
                        defaultMessage="Error adding inference endpoint: {errorMessage}"
                        values={{ errorMessage: inferenceAddError }}
                      />
                    </EuiText>
                  </EuiCallOut>
                  <EuiSpacer />
                </EuiFlexItem>
              )
            }
            onInferenceEndpointChange={onInferenceEndpointChange}
            inferenceEndpointError={inferenceEndpointError}
            trainedModels={trainedModels}
            onSaveInferenceEndpoint={onSaveInferenceCallback}
            onFlyoutClose={onFlyoutClose}
            isInferenceFlyoutVisible={isInferenceFlyoutVisible}
            supportedNlpModels={docLinks.supportedNlpModels}
            nlpImportModel={docLinks.nlpImportModel}
            isCreateInferenceApiLoading={isCreateInferenceApiLoading}
            setInferenceEndpointError={setInferenceEndpointError}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
