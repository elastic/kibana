/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useCallback } from 'react';
import { MlPluginStart } from '@kbn/ml-plugin/public';
import React, { useEffect } from 'react';
import { ElasticsearchModelDefaultOptions } from '@kbn/inference_integration_flyout/types';
import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { useDispatch, useMappingsState } from '../../../../../mappings_state_context';
import { FormHook } from '../../../../../shared_imports';
import { CustomInferenceEndpointConfig, Field, SemanticTextField } from '../../../../../types';
import { useMLModelNotificationToasts } from '../../../../../../../../hooks/use_ml_model_status_toasts';

import { getInferenceModels } from '../../../../../../../services/api';
import { getFieldByPathName } from '../../../../../reducer';
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
  const { fields, mappingViewFields, inferenceToModelIdMap } = useMappingsState();
  const dispatch = useDispatch();
  const { showSuccessToasts, showErrorToasts } = useMLModelNotificationToasts();

  const fieldTypeValue = form.getFields()?.type?.value;
  useEffect(() => {
    if (!Array.isArray(fieldTypeValue) || fieldTypeValue.length === 0) {
      return;
    }
    if (fieldTypeValue[0]?.value === 'semantic_text') {
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
        form.setFieldValue('referenceField', referenceField);
      }
      if (!form.getFormData().inference_id) {
        form.setFieldValue('inferenceId', 'elser_model_2');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldTypeValue]);

  const createInferenceEndpoint = useCallback(
    async (
      trainedModelId: ElasticsearchModelDefaultOptions | string,
      data: SemanticTextField,
      customInferenceEndpointConfig?: CustomInferenceEndpointConfig
    ) => {
      if (data.inference_id === undefined) {
        throw new Error(
          i18n.translate('xpack.idxMgmt.mappingsEditor.createField.undefinedInferenceIdError', {
            defaultMessage: 'Inference ID is undefined while creating the inference endpoint.',
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

      await ml?.mlApi?.inferenceModels?.createInferenceEndpoint(
        data.inference_id,
        taskType,
        modelConfig
      );
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
    const inferenceData = inferenceToModelIdMap?.[inferenceId as string];
    if (!inferenceData) {
      return;
    }

    const { trainedModelId } = inferenceData;
    const value = {
      ...data,
      name,
    };
    dispatch({ type: 'field.add', value });

    try {
      const inferenceModels = await getInferenceModels();
      const inferenceModel = inferenceModels.data?.some(
        (inference) => inference.model_id === inferenceId
      );
      // if inference endpoint exists already, do not create new inference endpoint
      if (inferenceModel) {
        return;
      }

      if (trainedModelId) {
        // show toasts only if it's an Elastic model
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
    handleSemanticText,
  };
}
