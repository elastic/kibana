/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { MlPluginStart } from '@kbn/ml-plugin/public';
import React, { useEffect } from 'react';
import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import {
  ELSER_ID_V1,
  ELSER_LINUX_OPTIMIZED_MODEL_ID,
  ELSER_MODEL_ID,
} from '@kbn/ml-trained-models-utils';
import { useDispatch, useMappingsState } from '../../../../../mappings_state_context';
import { FormHook } from '../../../../../shared_imports';
import { CustomInferenceEndpointConfig, Field, SemanticTextField } from '../../../../../types';
import { useMLModelNotificationToasts } from '../../../../../../../../hooks/use_ml_model_status_toasts';

import { getFieldByPathName } from '../../../../../reducer';
import { getInferenceEndpoints } from '../../../../../../../services/api';
interface UseSemanticTextProps {
  form: FormHook<Field, Field>;
  ml?: MlPluginStart;
  setErrorsInTrainedModelDeployment?: React.Dispatch<
    React.SetStateAction<Record<string, string | undefined>>
  >;
}
interface DefaultInferenceEndpointConfig {
  taskType: InferenceTaskType;
  service: string;
}

export function useSemanticText(props: UseSemanticTextProps) {
  const { form, setErrorsInTrainedModelDeployment, ml } = props;
  const { fields, mappingViewFields, inferenceToModelIdMap } = useMappingsState();
  const dispatch = useDispatch();
  const { showSuccessToasts, showErrorToasts, showSuccessfullyDeployedToast } =
    useMLModelNotificationToasts();

  const fieldTypeValue = form.getFormData()?.type;
  useEffect(() => {
    if (fieldTypeValue === 'semantic_text') {
      const allFields = {
        byId: {
          ...fields.byId,
          ...mappingViewFields.byId,
        },
        rootLevelFields: [],
        aliases: {},
        maxNestedDepth: 0,
      };
      const defaultName = getFieldByPathName(allFields, 'semantic_text') ? '' : 'semantic_text';
      const referenceField =
        Object.values(allFields.byId)
          .find((field) => field.source.type === 'text')
          ?.path.join('.') || '';
      if (!form.getFormData().name) {
        form.setFieldValue('name', defaultName);
      }
      if (!form.getFormData().reference_field) {
        form.setFieldValue('reference_field', referenceField);
      }
      if (!form.getFormData().inference_id) {
        form.setFieldValue('inference_id', 'elser_model_2');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldTypeValue]);

  const createInferenceEndpoint = useCallback(
    async (
      trainedModelId: string,
      inferenceId: string,
      customInferenceEndpointConfig?: CustomInferenceEndpointConfig
    ) => {
      const isElser = [ELSER_LINUX_OPTIMIZED_MODEL_ID, ELSER_ID_V1, ELSER_MODEL_ID].includes(
        trainedModelId
      );
      const defaultInferenceEndpointConfig: DefaultInferenceEndpointConfig = {
        service: isElser ? 'elser' : 'elasticsearch',
        taskType: isElser ? 'sparse_embedding' : 'text_embedding',
      };

      const modelConfig = customInferenceEndpointConfig
        ? customInferenceEndpointConfig.modelConfig
        : {
            service: defaultInferenceEndpointConfig.service,
            service_settings: {
              num_allocations: 1,
              num_threads: 1,
              model_id: trainedModelId,
            },
          };
      const taskType: InferenceTaskType =
        customInferenceEndpointConfig?.taskType ?? defaultInferenceEndpointConfig.taskType;

      await ml?.mlApi?.inferenceModels?.createInferenceEndpoint(inferenceId, taskType, modelConfig);
    },
    [ml?.mlApi?.inferenceModels]
  );

  const handleSemanticText = async (
    data: SemanticTextField,
    customInferenceEndpointConfig?: CustomInferenceEndpointConfig
  ) => {
    const inferenceId = data.inference_id;
    const referenceField = data.reference_field;
    const name = data.name;
    if (!inferenceId || !referenceField || !name) {
      return;
    }
    const inferenceData = inferenceToModelIdMap?.[inferenceId];
    if (!inferenceData) {
      return;
    }

    const { trainedModelId } = inferenceData;
    dispatch({ type: 'field.add', value: data });
    const inferenceEndpoints = await getInferenceEndpoints();
    const hasInferenceEndpoint = inferenceEndpoints.data?.some(
      (inference) => inference.model_id === inferenceId
    );
    // if inference endpoint exists already, do not create new inference endpoint
    if (hasInferenceEndpoint) {
      return;
    }
    try {
      // Only show toast if it's an internal Elastic model that hasn't been deployed yet
      if (trainedModelId && inferenceData.isDeployable && !inferenceData.isDeployed) {
        showSuccessToasts(trainedModelId);
      }
      await createInferenceEndpoint(
        trainedModelId,
        data.inference_id,
        customInferenceEndpointConfig
      );
      if (trainedModelId) {
        // clear error because we've succeeded here
        setErrorsInTrainedModelDeployment?.((prevItems) => ({
          ...prevItems,
          [trainedModelId]: undefined,
        }));
      }
      showSuccessfullyDeployedToast(trainedModelId);
    } catch (error) {
      // trainedModelId is empty string when it's a third party model
      if (trainedModelId) {
        setErrorsInTrainedModelDeployment?.((prevItems) => ({
          ...prevItems,
          [trainedModelId]: error,
        }));
      }
      showErrorToasts(error);
    }
  };

  return {
    createInferenceEndpoint,
    handleSemanticText,
  };
}
