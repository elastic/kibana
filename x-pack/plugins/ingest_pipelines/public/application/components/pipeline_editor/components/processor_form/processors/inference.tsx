/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode, EuiLink } from '@elastic/eui';

import {
  FIELD_TYPES,
  fieldValidators,
  UseField,
  Field,
  useKibana,
} from '../../../../../../shared_imports';

import { XJsonEditor } from '../field_components';

import { TargetField } from './common_fields/target_field';

import { FieldsConfig, to, from, EDITOR_PX_HEIGHT } from './shared';

const { emptyField, isJsonField } = fieldValidators;

const INFERENCE_CONFIG_DOCS = {
  documentation: {
    linkLabel: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.inferenceForm.inferenceConfigField.documentationLinkLabel',
      { defaultMessage: 'documentation' }
    ),
  },
};

function getInferenceConfigHelpText(documentationDocsLink: string): React.ReactNode {
  return (
    <FormattedMessage
      id="xpack.ingestPipelines.pipelineEditor.inferenceForm.inferenceConfigurationHelpText"
      defaultMessage="Contains the inference type and its options. Refer to the {documentation} for the available configuration options."
      values={{
        documentation: (
          <EuiLink external target="_blank" href={documentationDocsLink}>
            {INFERENCE_CONFIG_DOCS.documentation.linkLabel}
          </EuiLink>
        ),
      }}
    />
  );
}

const fieldsConfig: FieldsConfig = {
  /* Required fields config */
  model_id: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.inferenceForm.modelIDFieldLabel', {
      defaultMessage: 'Model ID',
    }),
    deserializer: String,
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.inferenceForm.modelIDFieldHelpText',
      {
        defaultMessage: 'ID of the model to infer against.',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.inferenceForm.patternRequiredError',
            {
              defaultMessage: 'A model ID value is required.',
            }
          )
        ),
      },
    ],
  },

  /* Optional fields config */
  field_map: {
    type: FIELD_TYPES.TEXT,
    deserializer: to.jsonString,
    serializer: from.optionalJson,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.inferenceForm.fieldMapLabel', {
      defaultMessage: 'Field map (optional)',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.inferenceForm.fieldMapHelpText',
      {
        defaultMessage:
          'Maps document field names to the known field names of the model. Takes precedence over any mappings in the model.',
      }
    ),
    validations: [
      {
        validator: isJsonField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.inferenceForm.fieldMapInvalidJSONError',
            { defaultMessage: 'Invalid JSON' }
          ),
          {
            allowEmptyString: true,
          }
        ),
      },
    ],
  },

  inference_config: {
    type: FIELD_TYPES.TEXT,
    deserializer: to.jsonString,
    serializer: from.optionalJson,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.inferenceForm.inferenceConfigLabel',
      {
        defaultMessage: 'Inference configuration (optional)',
      }
    ),
    validations: [
      {
        validator: isJsonField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.grokForm.patternsDefinitionsInvalidJSONError',
            { defaultMessage: 'Invalid JSON' }
          ),
          {
            allowEmptyString: true,
          }
        ),
      },
    ],
  },
};

export const Inference: FunctionComponent = () => {
  const { services } = useKibana();
  const documentationDocsLink = services.documentation.getDocumentationUrl();
  return (
    <>
      <UseField config={fieldsConfig.model_id} component={Field} path="fields.model_id" />

      <TargetField
        helpText={
          <FormattedMessage
            id="xpack.ingestPipelines.pipelineEditor.inferenceForm.targetFieldHelpText"
            defaultMessage="Field used to contain inference processor results. Defaults to {targetField}."
            values={{ targetField: <EuiCode>{'ml.inference.<processor_tag>'}</EuiCode> }}
          />
        }
      />

      <UseField
        config={fieldsConfig.field_map}
        component={XJsonEditor}
        componentProps={{
          editorProps: {
            height: EDITOR_PX_HEIGHT.medium,
            options: { minimap: { enabled: false } },
          },
        }}
        path="fields.field_map"
      />

      <UseField
        config={{
          ...fieldsConfig.inference_config,
          helpText: getInferenceConfigHelpText(documentationDocsLink),
        }}
        component={XJsonEditor}
        componentProps={{
          editorProps: {
            height: EDITOR_PX_HEIGHT.medium,
            options: { minimap: { enabled: false } },
          },
        }}
        path="fields.inference_config"
      />
    </>
  );
};
