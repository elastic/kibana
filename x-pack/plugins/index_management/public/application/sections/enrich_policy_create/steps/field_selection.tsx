/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import {
  useForm,
  Form,
  fieldValidators,
  FormSchema,
  UseField,
  SelectField,
  ComboBoxField,
  FIELD_TYPES,
} from '../../../../shared_imports';

import { useCreatePolicyContext, DraftPolicy } from '../create_policy_context';

interface Props {
  onNext: () => void;
}

export const fieldSelectionFormSchema: FormSchema = {
  matchField: {
    type: FIELD_TYPES.SELECT,
    label: i18n.translate('xpack.ingestPipelines.form.matchFieldFieldLabel', {
      defaultMessage: 'Match field',
    }),
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.circleForm.errorDistanceError', {
            defaultMessage: 'A match field is required.',
          })
        ),
      },
    ],
  },

  enrichFields: {
    defaultValue: [],
    type: FIELD_TYPES.COMBO_BOX,
    label: i18n.translate('xpack.ingestPipelines.form.enrichFieldsFieldLabel', {
      defaultMessage: 'Enrich fields',
    }),
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.circleForm.errorDistanceError', {
            defaultMessage: 'At least one enrich field is required.',
          })
        ),
      },
    ],
  },
};

export const FieldSelectionStep = ({ onNext }: Props) => {
  const { draft, updateDraft } = useCreatePolicyContext();

  const { form } = useForm({
    defaultValue: draft,
    schema: fieldSelectionFormSchema,
    id: 'fieldSelectionForm',
  });

  const onSubmit = async () => {
    const { isValid, data } = await form.submit();

    if (!isValid) {
      return;
    }

    // Update draft state with the data of the form
    updateDraft((prevDraft: DraftPolicy) => ({
      ...prevDraft,
      ...data,
    }));

    // And then navigate to the next step
    onNext();
  };

  return (
    <Form form={form}>
      <UseField
        path="matchField"
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

      <UseField
        path="enrichFields"
        component={ComboBoxField}
        componentProps={{
          fullWidth: false,
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
