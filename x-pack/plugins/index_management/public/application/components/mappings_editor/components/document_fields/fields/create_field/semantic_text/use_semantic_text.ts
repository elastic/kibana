/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useCallback } from 'react';
import { MlPluginStart } from '@kbn/ml-plugin/public';
import React, { useEffect, useState } from 'react';
import { ElasticsearchModelDefaultOptions } from '@kbn/inference_integration_flyout/types';
import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { useDispatch, useMappingsState } from '../../../../../mappings_state_context';
import { FormHook } from '../../../../../shared_imports';
import { CustomInferenceEndpointConfig, DefaultInferenceModels, Field } from '../../../../../types';
import { useMLModelNotificationToasts } from '../../../../../../../../hooks/use_ml_model_status_toasts';

import { getInferenceModels } from '../../../../../../../services/api';
interface UseSemanticTextProps {
  form: FormHook<Field, Field>;
  ml?: MlPluginStart;
  setErrorsInTrainedModelDeployment: React.Dispatch<React.SetStateAction<string[]>> | undefined;
}
interface DefaultInferenceEndpointConfig {
  taskType: InferenceTaskType;
  service: string;
}

export function useSemanticText(props: UseSemanticTextProps) {
  const { form, setErrorsInTrainedModelDeployment, ml } = props;
  const { inferenceToModelIdMap } = useMappingsState();
  const dispatch = useDispatch();
  const [referenceFieldComboValue, setReferenceFieldComboValue] = useState<string>();
  const [nameValue, setNameValue] = useState<string>();
  const [inferenceIdComboValue, setInferenceIdComboValue] = useState<string>();
  const [semanticFieldType, setSemanticTextFieldType] = useState<string>();
  const [inferenceValue, setInferenceValue] = useState<string>(
    DefaultInferenceModels.elser_model_2
  );
  const { showSuccessToasts, showErrorToasts } = useMLModelNotificationToasts();

  const useFieldEffect = (
    semanticTextform: FormHook,
    fieldName: string,
    setState: React.Dispatch<React.SetStateAction<string | undefined>>
  ) => {
    const fieldValue = semanticTextform.getFields()?.[fieldName]?.value;
    useEffect(() => {
      if (typeof fieldValue === 'string') {
        setState(fieldValue);
      }
    }, [semanticTextform, fieldValue, setState]);
  };

  useFieldEffect(form, 'referenceField', setReferenceFieldComboValue);
  useFieldEffect(form, 'name', setNameValue);

  const fieldTypeValue = form.getFields()?.type?.value;
  useEffect(() => {
    if (!Array.isArray(fieldTypeValue) || fieldTypeValue.length === 0) {
      return;
    }
    setSemanticTextFieldType(
      fieldTypeValue[0]?.value === 'semantic_text' ? fieldTypeValue[0].value : undefined
    );
  }, [form, fieldTypeValue]);

  const inferenceId = form.getFields()?.inferenceId?.value;
  useEffect(() => {
    if (typeof inferenceId === 'string') {
      setInferenceIdComboValue(inferenceId);
    }
  }, [form, inferenceId, inferenceToModelIdMap]);

  const createInferenceEndpoint = useCallback(
    async (
      trainedModelId: ElasticsearchModelDefaultOptions | string,
      data: Field,
      customInferenceEndpointConfig?: CustomInferenceEndpointConfig
    ) => {
      if (data.inferenceId === undefined) {
        throw new Error(
          i18n.translate('xpack.idxMgmt.mappingsEditor.createField.undefinedInferenceIdError', {
            defaultMessage: 'InferenceId is undefined while creating the inference endpoint.',
          })
        );
      }
      const defaultInferenceEndpointConfig: DefaultInferenceEndpointConfig = {
        service:
          trainedModelId === ElasticsearchModelDefaultOptions.elser ? 'elser' : 'elasticsearch',
        taskType:
          trainedModelId === ElasticsearchModelDefaultOptions.elser
            ? 'sparse_embedding'
            : 'text_embedding',
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
      try {
        await ml?.mlApi?.inferenceModels?.createInferenceEndpoint(
          data.inferenceId,
          taskType,
          modelConfig
        );
      } catch (error) {
        throw error;
      }
    },
    [ml?.mlApi?.inferenceModels]
  );

  const handleSemanticText = async (
    data: Field,
    customInferenceEndpointConfig?: CustomInferenceEndpointConfig
  ) => {
    data.inferenceId = inferenceValue;
    if (data.inferenceId === undefined) {
      return;
    }
    const inferenceData = inferenceToModelIdMap?.[data.inferenceId];
    if (!inferenceData) {
      return;
    }

    const { trainedModelId } = inferenceData;
    dispatch({ type: 'field.addSemanticText', value: data });

    try {
      // if model exists already, do not create inference endpoint
      const inferenceModels = await getInferenceModels();
      const inferenceModel: InferenceAPIConfigResponse[] = inferenceModels.data.some(
        (e: InferenceAPIConfigResponse) => e.model_id === inferenceValue
      );
      if (inferenceModel) {
        return;
      }

      if (trainedModelId) {
        // show toasts only if it's elastic models
        showSuccessToasts();
      }

      await createInferenceEndpoint(trainedModelId, data, customInferenceEndpointConfig);
    } catch (error) {
      // trainedModelId is empty string when it's a third party model
      if (trainedModelId) {
        setErrorsInTrainedModelDeployment?.((prevItems) => [...prevItems, trainedModelId]);
      }
      showErrorToasts(error);
    }
  };

  return {
    referenceFieldComboValue,
    nameValue,
    inferenceIdComboValue,
    semanticFieldType,
    handleSemanticText,
    setInferenceValue,
  };
}
