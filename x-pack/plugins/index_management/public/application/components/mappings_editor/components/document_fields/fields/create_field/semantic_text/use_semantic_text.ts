/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MlPluginStart } from '@kbn/ml-plugin/public';
import React, { useEffect, useState } from 'react';
import { useComponentTemplatesContext } from '../../../../../../component_templates/component_templates_context';
import { useDispatch, useMappingsState } from '../../../../../mappings_state_context';
import { FormHook } from '../../../../../shared_imports';
import { Field } from '../../../../../types';

interface UseSemanticTextProps {
  form: FormHook<Field, Field>;
  ml?: MlPluginStart;
  setErrorsInTrainedModelDeployment: React.Dispatch<React.SetStateAction<string[]>> | undefined;
}

export function useSemanticText(props: UseSemanticTextProps) {
  const { form, setErrorsInTrainedModelDeployment, ml } = props;
  const { inferenceToModelIdMap } = useMappingsState();
  const { toasts } = useComponentTemplatesContext();
  const dispatch = useDispatch();

  const [referenceFieldComboValue, setReferenceFieldComboValue] = useState<string>();
  const [nameValue, setNameValue] = useState<string>();
  const [inferenceIdComboValue, setInferenceIdComboValue] = useState<string>();
  const [semanticFieldType, setSemanticTextFieldType] = useState<string>();
  const [inferenceValue, setInferenceValue] = useState<string>('elser_model_2');

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

  const handleSemanticText = (data: Field) => {
    data.inferenceId = inferenceValue;
    if (data.inferenceId === undefined) {
      return;
    }

    const inferenceData = inferenceToModelIdMap?.[data.inferenceId];

    if (!inferenceData) {
      return;
    }

    const { trainedModelId, defaultInferenceEndpoint, isDeployed, isDeployable } = inferenceData;

    if (trainedModelId && defaultInferenceEndpoint) {
      const modelConfig = {
        service: 'elasticsearch',
        service_settings: {
          num_allocations: 1,
          num_threads: 1,
          model_id: trainedModelId,
        },
      };
      try {
        ml?.mlApi?.inferenceModels?.createInferenceEndpoint(
          data.inferenceId,
          'text_embedding',
          modelConfig
        );
      } catch (error) {
        setErrorsInTrainedModelDeployment?.((prevItems) => [...prevItems, trainedModelId]);
        toasts?.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
          title: i18n.translate(
            'xpack.idxMgmt.mappingsEditor.createField.inferenceEndpointCreationErrorTitle',
            {
              defaultMessage: 'Inference endpoint creation failed',
            }
          ),
        });
      }
    }

    if (isDeployable && trainedModelId && !isDeployed) {
      try {
        ml?.mlApi?.trainedModels.startModelAllocation(trainedModelId);
        toasts?.addSuccess({
          title: i18n.translate(
            'xpack.idxMgmt.mappingsEditor.createField.modelDeploymentStartedNotification',
            {
              defaultMessage: 'Model deployment started',
            }
          ),
          text: i18n.translate(
            'xpack.idxMgmt.mappingsEditor.createField.modelDeploymentNotification',
            {
              defaultMessage: '1 model is being deployed on your ml_node.',
            }
          ),
        });
      } catch (error) {
        setErrorsInTrainedModelDeployment?.((prevItems) => [...prevItems, trainedModelId]);
        toasts?.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
          title: i18n.translate(
            'xpack.idxMgmt.mappingsEditor.createField.modelDeploymentErrorTitle',
            {
              defaultMessage: 'Model deployment failed',
            }
          ),
        });
      }
    }

    dispatch({ type: 'field.addSemanticText', value: data });
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
