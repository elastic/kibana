/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Index } from '@kbn/index-management';
import { MlPluginStart } from '@kbn/ml-plugin/public';
import { useState, useEffect } from 'react';
import { normalize } from '../components/mappings_editor/lib';
import { isLocalModel } from '../components/mappings_editor/lib/utils';
import { NormalizedField } from '../components/mappings_editor/types';
import { useLoadIndexMappings, useLoadInferenceEndpoints } from '../services';
import { parseMappings } from '../shared/parse_mappings';

export const useIndexErrors = (
  index: Index,
  ml: MlPluginStart | undefined,
  canGetTrainedModels: boolean
) => {
  const { data } = useLoadIndexMappings(index.name);
  const { data: endpoints } = useLoadInferenceEndpoints();
  const [errors, setErrors] = useState<Array<{ field: NormalizedField; error: string }>>([]);
  useEffect(() => {
    const mappings = data;
    if (!mappings || !canGetTrainedModels || !endpoints || !ml) {
      return;
    }

    const parsedMappings = parseMappings(mappings);
    const normalizedFields = normalize(parsedMappings.parsedDefaultValue?.fields);
    const semanticTextFields = Object.values(normalizedFields.byId).filter(
      (field) => field.source.type === 'semantic_text'
    );
    const fetchErrors = async () => {
      const trainedModelStats = await ml.mlApi?.trainedModels.getTrainedModelStats();

      const semanticTextFieldsWithErrors = semanticTextFields
        .map((field) => {
          const model = endpoints.find(
            (endpoint) => endpoint.model_id === field.source.inference_id
          );
          if (!model) {
            return {
              field,
              error: i18n.translate(
                'xpack.idxMgmt.indexOverview.indexErrors.missingInferenceEndpointError',
                {
                  defaultMessage: 'Inference endpoint {inferenceId} not found',
                  values: {
                    inferenceId: field.source.inference_id as string,
                  },
                }
              ),
            };
          }
          if (isLocalModel(model)) {
            const modelId = model.service_settings.model_id;
            const modelStats = trainedModelStats?.trained_model_stats.find(
              (value) => value.model_id === modelId
            );
            if (!modelStats || modelStats.deployment_stats?.state !== 'started') {
              return {
                field,
                error: i18n.translate(
                  'xpack.idxMgmt.indexOverview.indexErrors.modelNotStartedError',
                  {
                    defaultMessage:
                      'Model {modelId} for inference endpoint {inferenceId} in field {fieldName} has not been started',
                    values: {
                      inferenceId: field.source.inference_id as string,
                      fieldName: field.path.join('.'),
                      modelId,
                    },
                  }
                ),
              };
            }
          }
          return { field, error: '' };
        })
        .filter((value) => !!value.error);
      setErrors(semanticTextFieldsWithErrors);
    };

    if (semanticTextFields.length) {
      fetchErrors();
    }
  }, [data, canGetTrainedModels, endpoints, ml, ml?.mlApi?.trainedModels]);
  return errors;
};
