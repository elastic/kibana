/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  InferenceServiceSettings,
  MappingProperty,
  MappingPropertyBase,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';

import { EuiButton, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { LocalInferenceServiceSettings } from '@kbn/ml-trained-models-utils/src/constants/trained_models';

import { KibanaLogic } from '../../../shared/kibana';
import { mappingsWithPropsApiLogic } from '../../api/mappings/mappings_logic';

export interface IndexErrorProps {
  indexName: string;
}

interface SemanticTextProperty extends MappingPropertyBase {
  inference_id: string;
  type: 'semantic_text';
}

const isInferencePreconfigured = (inferenceId: string) => inferenceId.startsWith('.');

const parseMapping = (mappings: MappingTypeMapping) => {
  const fields = mappings.properties;
  if (!fields) {
    return [];
  }
  return getSemanticTextFields(fields, '');
};

const getSemanticTextFields = (
  fields: Record<string, MappingProperty>,
  path: string
): Array<{ path: string; source: SemanticTextProperty }> => {
  return Object.entries(fields).flatMap(([key, value]) => {
    const currentPath: string = path ? `${path}.${key}` : key;
    const currentField: Array<{ path: string; source: SemanticTextProperty }> =
      value.type === 'semantic_text' ? [{ path: currentPath, source: value }] : [];
    if (hasProperties(value)) {
      const childSemanticTextFields: Array<{ path: string; source: SemanticTextProperty }> =
        value.properties ? getSemanticTextFields(value.properties, currentPath) : [];
      return [...currentField, ...childSemanticTextFields];
    }
    return currentField;
  });
};

function hasProperties(field: MappingProperty): field is MappingPropertyBase {
  return !!(field as MappingPropertyBase).properties;
}

function isLocalModel(model: InferenceServiceSettings): model is LocalInferenceServiceSettings {
  return ['elser', 'elasticsearch'].includes((model as LocalInferenceServiceSettings).service);
}

export const IndexError: React.FC<IndexErrorProps> = ({ indexName }) => {
  const { makeRequest: makeMappingRequest } = useActions(mappingsWithPropsApiLogic(indexName));
  const { data } = useValues(mappingsWithPropsApiLogic(indexName));
  const { ml } = useValues(KibanaLogic);
  const [errors, setErrors] = useState<
    Array<{ error: string; field: { path: string; source: SemanticTextProperty } }>
  >([]);

  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    makeMappingRequest({ indexName });
  }, [indexName]);

  useEffect(() => {
    const mappings = data?.mappings;
    if (!mappings || !ml) {
      return;
    }

    const semanticTextFields = parseMapping(mappings);
    const fetchErrors = async () => {
      const trainedModelStats = await ml?.mlApi?.trainedModels.getTrainedModelStats();
      const endpoints = await ml?.mlApi?.inferenceModels.getAllInferenceEndpoints();
      if (!trainedModelStats || !endpoints) {
        return [];
      }

      const semanticTextFieldsWithErrors = semanticTextFields
        .map((field) => {
          const model = endpoints.endpoints.find(
            (endpoint) => endpoint.inference_id === field.source.inference_id
          );
          if (!model) {
            return {
              error: i18n.translate(
                'xpack.enterpriseSearch.indexOverview.indexErrors.missingModelError',
                {
                  defaultMessage: 'Inference endpoint {inferenceId} not found',
                  values: {
                    inferenceId: field.source.inference_id as string,
                  },
                }
              ),
              field,
            };
          }
          if (isLocalModel(model) && !isInferencePreconfigured(model.inference_id)) {
            const modelId = model.service_settings.model_id;
            const modelStats = trainedModelStats?.trained_model_stats.find(
              (value) =>
                value.model_id === modelId &&
                value.deployment_stats?.deployment_id === field.source.inference_id
            );
            if (!modelStats || modelStats.deployment_stats?.state !== 'started') {
              return {
                error: i18n.translate(
                  'xpack.enterpriseSearch.indexOverview.indexErrors.modelNotDeployedError',
                  {
                    defaultMessage:
                      'Model {modelId} for inference endpoint {inferenceId} in field {fieldName} has not been started',
                    values: {
                      fieldName: field.path,
                      inferenceId: field.source.inference_id as string,
                      modelId,
                    },
                  }
                ),
                field,
              };
            }
          }
          return { error: '', field };
        })
        .filter((value) => !!value.error);
      setErrors(semanticTextFieldsWithErrors);
    };

    if (semanticTextFields.length) {
      fetchErrors();
    }
  }, [data]);
  return errors.length > 0 ? (
    <EuiCallOut
      data-test-subj="indexErrorCallout"
      color="danger"
      iconType="error"
      title={i18n.translate('xpack.enterpriseSearch.indexOverview.indexErrors.title', {
        defaultMessage: 'Index has errors',
      })}
    >
      {showErrors && (
        <>
          <p>
            {i18n.translate('xpack.enterpriseSearch.indexOverview.indexErrors.body', {
              defaultMessage: 'Found errors in the following fields:',
            })}
            {errors.map(({ field, error }) => (
              <li key={field.path}>
                <strong>{field.path}</strong>: {error}
              </li>
            ))}
          </p>
          <EuiButton
            data-test-subj="enterpriseSearchIndexErrorHideFullErrorButton"
            color="danger"
            onClick={() => setShowErrors(false)}
          >
            {i18n.translate('xpack.enterpriseSearch.indexOverview.indexErrors.hideErrorsLabel', {
              defaultMessage: 'Hide full error',
            })}
          </EuiButton>
        </>
      )}
      {!showErrors && (
        <EuiButton
          data-test-subj="enterpriseSearchIndexErrorShowFullErrorButton"
          color="danger"
          onClick={() => setShowErrors(true)}
        >
          {i18n.translate('xpack.enterpriseSearch.indexOverview.indexErrors.showErrorsLabel', {
            defaultMessage: 'Show full error',
          })}
        </EuiButton>
      )}
    </EuiCallOut>
  ) : null;
};
