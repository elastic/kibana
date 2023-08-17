/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiCode, EuiFormRow, EuiSelect, EuiSpacer } from '@elastic/eui';
import {
  useForm,
  Form,
  fieldValidators,
  FormSchema,
  FIELD_TYPES,
  UseField,
  TextField,
  SelectField,
  JsonEditorField,
} from '../../../../shared_imports';

interface Props {
  onNext: () => void;
}

export const configurationFormSchema: FormSchema = {
  name: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.configuration.dateDetectionFieldLabel', {
      defaultMessage: 'Policy name',
    }),
    type: FIELD_TYPES.TEXT,
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.inferenceForm.patternRequiredError',
            {
              defaultMessage: 'A policy name value is required.',
            }
          )
        ),
      },
    ],
  },

  policyType: {
    type: FIELD_TYPES.SELECT,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.enrichForm.shapeRelationFieldLabel',
      {
        defaultMessage: 'Policy type',
      }
    ),
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.inferenceForm.typeRequiredError', {
            defaultMessage: 'A policy type value is required.',
          })
        ),
      },
    ],
  },

  query: {
    label: i18n.translate('xpack.ingestPipelines.form.metaFieldLabel', {
      defaultMessage: 'Query (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.form.metaHelpText"
        defaultMessage="Defaults to: {code}"
        values={{
          code: <EuiCode>{JSON.stringify({ match_all: {} })}</EuiCode>,
        }}
      />
    ),
    validations: [
      {
        validator: fieldValidators.isJsonField(
          i18n.translate('xpack.ingestPipelines.form.validation.metaJsonError', {
            defaultMessage: 'The input is not valid.',
          }),
          { allowEmptyString: true }
        ),
      },
    ],
  },
};

const defaultValue = {};

export const ConfigurationStep = ({ onNext }: Props) => {
  const [editorValue, setEditorValue] = useState('');

  const { form } = useForm({
    defaultValue,
    schema: configurationFormSchema,
    id: 'configurationForm',
  });

  const onSubmit = async () => {
    await form.validate();

    if (!form.isValid) {
      return;
    }

    console.log('onSubmit', form.getFormData());
  };

  return (
    <Form form={form} isInvalid={form.isSubmitted && !form.isValid} error={form.getErrors()}>
      <UseField path="name" component={TextField} componentProps={{ fullWidth: false }} />

      <UseField
        path="policyType"
        component={SelectField}
        componentProps={{
          fullWidth: false,
          euiFieldProps: {
            options: [
              {
                value: 'match',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.enrichForm.matchOption',
                  { defaultMessage: 'Match' }
                ),
              },
              {
                value: 'geo_match',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.enrichFrom.geoMatchOption',
                  { defaultMessage: 'Geo match' }
                ),
              },
              {
                value: 'range',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.enrichFrom.rangeOption',
                  { defaultMessage: 'range' }
                ),
              },
            ],
          },
        }}
      />

      <EuiFormRow label="Source indices">
        <EuiSelect
          hasNoInitialSelection
          onChange={() => {}}
          options={[
            { value: 'option_one', text: 'Option one' },
            { value: 'option_two', text: 'Option two' },
            { value: 'option_three', text: 'Option three' },
          ]}
        />
      </EuiFormRow>

      <UseField
        path="query"
        component={JsonEditorField}
        componentProps={{
          fullWidth: false,
          codeEditorProps: {
            height: '300px',
            allowFullScreen: true,
            'aria-label': i18n.translate('xpack.ingestPipelines.form.metaAriaLabel', {
              defaultMessage: 'query field data editor',
            }),
            options: {
              lineNumbers: 'off',
              tabSize: 2,
              automaticLayout: true,
            },
          },
        }}
      />

      <EuiSpacer />

      <EuiButton
        fill
        color="primary"
        iconSide="right"
        iconType="arrowRight"
        disabled={form.isValid === false}
        onClick={onSubmit}
      >
        <FormattedMessage
          id="xpack.idxMgmt.enrichPolicies.create.stepConfiguration.nextButtonLabel"
          defaultMessage="Next"
        />
      </EuiButton>
    </Form>
  );
};
