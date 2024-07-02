/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiCallOut, EuiText, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { InferenceFlyoutWrapper } from '@kbn/inference_integration_flyout/components/inference_flyout_wrapper';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';

import { ModelConfig } from '@kbn/inference_integration_flyout/types';
import { extractErrorProperties } from '@kbn/ml-error-utils';
import { TrainedModelConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';
import { SUPPORTED_PYTORCH_TASKS, TRAINED_MODEL_TYPE } from '@kbn/ml-trained-models-utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import * as i18n from '../../common/translations';
import { INFERENCE_ENDPOINTS_QUERY_KEY } from '../../common/constants';
import { useKibana } from '../hooks/use_kibana';
import { docLinks } from '../../common/doc_links';

interface InferenceFlyoutWrapperComponentProps {
  inferenceEndpoints: InferenceAPIConfigResponse[];
  isInferenceFlyoutVisible: boolean;
  setIsInferenceFlyoutVisible: (isVisible: boolean) => void;
}

export const InferenceFlyoutWrapperComponent: React.FC<InferenceFlyoutWrapperComponentProps> = ({
  inferenceEndpoints,
  isInferenceFlyoutVisible,
  setIsInferenceFlyoutVisible,
}) => {
  const [inferenceAddError, setInferenceAddError] = useState<string | undefined>(undefined);
  const [isCreateInferenceApiLoading, setIsCreateInferenceApiLoading] = useState(false);
  const [availableTrainedModels, setAvailableTrainedModels] = useState<
    TrainedModelConfigResponse[]
  >([]);

  const [inferenceEndpointError, setInferenceEndpointError] = useState<string | undefined>(
    undefined
  );

  const queryClient = useQueryClient();

  const {
    services: { ml, notifications },
  } = useKibana();

  const toasts = notifications?.toasts;

  const createInferenceEndpointMutation = useMutation(
    async ({
      inferenceId,
      taskType,
      modelConfig,
    }: {
      inferenceId: string;
      taskType: InferenceTaskType;
      modelConfig: ModelConfig;
    }) => {
      if (!ml) {
        throw new Error(i18n.UNABLE_TO_CREATE_INFERENCE_ENDPOINT);
      }
      await ml?.mlApi?.inferenceModels?.createInferenceEndpoint(inferenceId, taskType, modelConfig);
      toasts?.addSuccess({
        title: i18n.ENDPOINT_ADDED_SUCCESS,
        text: i18n.ENDPOINT_ADDED_SUCCESS_DESCRIPTION(inferenceId),
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([INFERENCE_ENDPOINTS_QUERY_KEY]);
      },
    }
  );

  const onInferenceEndpointChange = useCallback(
    async (inferenceId: string) => {
      const modelsExist = inferenceEndpoints.some((i) => i.model_id === inferenceId);
      if (modelsExist) {
        setInferenceEndpointError(i18n.INFERENCE_ENDPOINT_ALREADY_EXISTS);
      } else {
        setInferenceEndpointError(undefined);
      }
    },
    [inferenceEndpoints]
  );

  const onSaveInferenceCallback = useCallback(
    async (inferenceId: string, taskType: InferenceTaskType, modelConfig: ModelConfig) => {
      setIsCreateInferenceApiLoading(true);

      createInferenceEndpointMutation
        .mutateAsync({ inferenceId, taskType, modelConfig })
        .catch((error) => {
          const errorObj = extractErrorProperties(error);
          notifications?.toasts?.addError(errorObj.message ? new Error(error.message) : error, {
            title: i18n.ENDPOINT_CREATION_FAILED,
          });
        })
        .finally(() => {
          setIsCreateInferenceApiLoading(false);
        });
      setIsInferenceFlyoutVisible(!isInferenceFlyoutVisible);
    },
    [
      createInferenceEndpointMutation,
      isInferenceFlyoutVisible,
      setIsInferenceFlyoutVisible,
      notifications,
    ]
  );

  const onFlyoutClose = useCallback(() => {
    setInferenceAddError(undefined);
    setIsInferenceFlyoutVisible(!isInferenceFlyoutVisible);
  }, [isInferenceFlyoutVisible, setIsInferenceFlyoutVisible]);

  useEffect(() => {
    const fetchAvailableTrainedModels = async () => {
      let models;
      try {
        models = await ml?.mlApi?.trainedModels?.getTrainedModels();
      } catch (error) {
        const errorObj = extractErrorProperties(error);
        if (errorObj.statusCode === 403) {
          setInferenceAddError(i18n.FORBIDDEN_TO_ACCESS_TRAINED_MODELS);
        } else {
          setInferenceAddError(errorObj.message);
        }
      } finally {
        setAvailableTrainedModels(models || []);
      }
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
    <InferenceFlyoutWrapper
      errorCallout={
        inferenceAddError && (
          <EuiFlexItem grow={false}>
            <EuiCallOut color="danger" iconType="error" title={i18n.ERROR_TITLE}>
              <EuiText>
                <FormattedMessage
                  id="xpack.searchInferenceEndpoints.inferenceEndpoints.inferenceId.errorDescription"
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
  );
};
