/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { InferenceFlyoutWrapper } from '@kbn/inference_integration_flyout/components/inference_flyout_wrapper';
import { ModelConfig } from '@kbn/inference_integration_flyout/types';
import { extractErrorProperties } from '@kbn/ml-error-utils';
import { TrainedModelConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';
import { SUPPORTED_PYTORCH_TASKS, TRAINED_MODEL_TYPE } from '@kbn/ml-trained-models-utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EmptyPromptPage } from './empty_prompt_page';
import { TabularPage } from './all_inference_endpoints/tabular_page';
import { INFERENCE_ENDPOINTS_QUERY_KEY } from '../../common/constants';
import { docLinks } from '../../common/doc_links';
import { useQueryInferenceEndpoints } from '../hooks/use_inference_endpoints';
import { useKibana } from '../hooks/use_kibana';

const addEndpointLabel = i18n.translate(
  'xpack.searchInferenceEndpoints.inferenceEndpoints.newInferenceEndpointButtonLabel',
  {
    defaultMessage: 'Add endpoint',
  }
);

export const InferenceEndpoints: React.FC = () => {
  const queryClient = useQueryClient();
  const { inferenceEndpoints } = useQueryInferenceEndpoints();

  const {
    services: { ml },
  } = useKibana();

  const [isInferenceFlyoutVisible, setIsInferenceFlyoutVisible] = useState<boolean>(false);
  const [inferenceAddError, setInferenceAddError] = useState<string | undefined>(undefined);
  const [isCreateInferenceApiLoading, setIsCreateInferenceApiLoading] = useState(false);
  const [availableTrainedModels, setAvailableTrainedModels] = useState<
    TrainedModelConfigResponse[]
  >([]);

  const [inferenceEndpointError, setInferenceEndpointError] = useState<string | undefined>(
    undefined
  );

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
      await ml?.mlApi?.inferenceModels?.createInferenceEndpoint(inferenceId, taskType, modelConfig);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([INFERENCE_ENDPOINTS_QUERY_KEY]);
      },
    }
  );

  const onInferenceEndpointChange = async () => {};
  const onSaveInferenceCallback = useCallback(
    async (inferenceId: string, taskType: InferenceTaskType, modelConfig: ModelConfig) => {
      setIsCreateInferenceApiLoading(true);
      try {
        await createInferenceEndpointMutation.mutateAsync({ inferenceId, taskType, modelConfig });
        setIsInferenceFlyoutVisible(!isInferenceFlyoutVisible);
      } catch (error) {
        const errorObj = extractErrorProperties(error);
        setInferenceAddError(errorObj.message);
      } finally {
        setIsCreateInferenceApiLoading(false);
      }
    },
    [createInferenceEndpointMutation, isInferenceFlyoutVisible]
  );

  const onFlyoutClose = useCallback(() => {
    setInferenceAddError(undefined);
    setIsInferenceFlyoutVisible(!isInferenceFlyoutVisible);
  }, [isInferenceFlyoutVisible]);

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
    <>
      {inferenceEndpoints.length > 0 && (
        <EuiPageTemplate.Header
          css={{ '.euiPageHeaderContent > .euiFlexGroup': { flexWrap: 'wrap' } }}
          data-test-subj="allInferenceEndpointsPage"
          pageTitle={i18n.translate(
            'xpack.searchInferenceEndpoints.inferenceEndpoints.allInferenceEndpoints.title',
            {
              defaultMessage: 'Inference endpoints',
            }
          )}
          description={i18n.translate(
            'xpack.searchInferenceEndpoints.inferenceEndpoints.allInferenceEndpoints.description',
            {
              defaultMessage:
                'Manage your Elastic and third-party endpoints generated from the Inference API.',
            }
          )}
          rightSideItems={[
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem>
                <EuiButton
                  key="newInferenceEndpoint"
                  color="primary"
                  iconType="plusInCircle"
                  data-test-subj="addEndpointButtonForAllInferenceEndpoints"
                  fill
                  onClick={() => setIsInferenceFlyoutVisible(true)}
                >
                  {addEndpointLabel}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>,
          ]}
        />
      )}
      <EuiPageTemplate.Section className="eui-yScroll">
        {inferenceEndpoints.length === 0 ? (
          <EmptyPromptPage
            addEndpointLabel={addEndpointLabel}
            setIsInferenceFlyoutVisible={setIsInferenceFlyoutVisible}
          />
        ) : (
          <TabularPage inferenceEndpoints={inferenceEndpoints} />
        )}
      </EuiPageTemplate.Section>
      {isInferenceFlyoutVisible && (
        <InferenceFlyoutWrapper
          errorCallout={
            inferenceAddError && (
              <EuiFlexItem grow={false}>
                <EuiCallOut
                  color="danger"
                  iconType="error"
                  title={i18n.translate(
                    'xpack.searchInferenceEndpoints.inferenceEndpoints.inferenceId.errorTitle',
                    {
                      defaultMessage: 'Error adding inference endpoint',
                    }
                  )}
                >
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
      )}
    </>
  );
};
