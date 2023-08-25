/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiSpacer, EuiComboBoxOptionOption } from '@elastic/eui';
import { FieldIcon as KbnFieldIcon } from '@kbn/react-field';
import {
  useForm,
  Form,
  fieldValidators,
  FormSchema,
  UseField,
  FIELD_TYPES,
  ComboBoxField,
} from '../../../../shared_imports';

import type { IndexWithFields, FieldItem } from '../../../../../common';
import { getFieldsFromIndices } from '../../../services/api';
import { useCreatePolicyContext, DraftPolicy } from '../create_policy_context';

interface Props {
  onNext: () => void;
}

export const fieldSelectionFormSchema: FormSchema = {
  matchField: {
    // Since this ComboBoxField is not a multi-select, we need to serialize/deserialize the value
    // into a string to be able to save it in the policy.
    defaultValue: '',
    type: FIELD_TYPES.COMBO_BOX,
    serializer: (v: string[]) => {
      return v.join(', ');
    },
    deserializer: (v: string) => {
      return v.length === 0 ? [] : v.split(', ');
    },
    label: i18n.translate('xpack.idxMgmt.enrichPolicyCreate.fieldSelectionStep.matchFieldField', {
      defaultMessage: 'Match field',
    }),
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.translate('xpack.idxMgmt.enrichPolicyCreate.fieldSelectionStep.matchFieldRequired', {
            defaultMessage: 'A match field is required.',
          })
        ),
      },
    ],
  },

  enrichFields: {
    defaultValue: [],
    type: FIELD_TYPES.COMBO_BOX,
    label: i18n.translate('xpack.idxMgmt.enrichPolicyCreate.fieldSelectionStep.enrichFieldsField', {
      defaultMessage: 'Enrich fields',
    }),
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.translate(
            'xpack.idxMgmt.enrichPolicyCreate.fieldSelectionStep.enrichFieldsRequired',
            {
              defaultMessage: 'At least one enrich field is required.',
            }
          )
        ),
      },
    ],
  },
};

const buildFieldOption = (field: FieldItem) => ({
  label: field.name,
  prepend: <KbnFieldIcon type={field.normalizedType} />,
});

export const FieldSelectionStep = ({ onNext }: Props) => {
  const [fieldOptions, setFieldOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [matchFieldOptions, setMatchFieldOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const { draft, updateDraft, updateCompletionState } = useCreatePolicyContext();

  useEffect(() => {
    const fetchFields = async () => {
      const { data } = await getFieldsFromIndices(draft.sourceIndices as string[]);

      if (data?.commonFields?.length) {
        setMatchFieldOptions(data.commonFields.map(buildFieldOption));
        // If there is only one index, we can use the fields of that index as match field options
      } else if (data?.indices?.length === 1) {
        setMatchFieldOptions(data.indices[0].fields.map(buildFieldOption));
      }

      if (data?.indices?.length) {
        setFieldOptions(
          data.indices.map((index: IndexWithFields) => ({
            label: index.index,
            options: index.fields.map(buildFieldOption),
          }))
        );
      }
    };

    fetchFields();
  }, [draft.sourceIndices]);

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

    // Update form completion state
    updateCompletionState((prevCompletionState) => ({
      ...prevCompletionState,
      fieldsSelectionStep: true,
    }));

    // Update draft state with the data of the form
    updateDraft((prevDraft: DraftPolicy) => ({
      ...prevDraft,
      ...data,
    }));

    // And then navigate to the next step
    onNext();
  };

  const hasSelectedMultipleIndices = (draft.sourceIndices?.length ?? 0) > 1;

  return (
    <Form form={form}>
      <UseField
        path="matchField"
        component={ComboBoxField}
        componentProps={{
          fullWidth: false,
          helpText: hasSelectedMultipleIndices
            ? i18n.translate(
                'xpack.idxMgmt.enrichPolicyCreate.fieldSelectionStep.matchFieldHelpText',
                {
                  defaultMessage:
                    'Since multiple source indices were selected in the previous step, the match field must be the same across all selected source indices.',
                }
              )
            : undefined,
          euiFieldProps: {
            placeholder: i18n.translate(
              'xpack.idxMgmt.enrichPolicyCreate.fieldSelectionStep.matchFieldPlaceholder',
              {
                defaultMessage: 'Select a field',
              }
            ),
            noSuggestions: false,
            singleSelection: { asPlainText: true },
            options: matchFieldOptions,
          },
        }}
      />

      <UseField
        path="enrichFields"
        component={ComboBoxField}
        componentProps={{
          fullWidth: false,
          euiFieldProps: {
            placeholder: i18n.translate(
              'xpack.idxMgmt.enrichPolicyCreate.fieldSelectionStep.enrichFieldsPlaceholder',
              {
                defaultMessage: 'Select fields to enrich',
              }
            ),
            noSuggestions: false,
            options: fieldOptions,
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
          id="xpack.idxMgmt.enrichPolicyCreate.fieldSelectionStep.nextButtonLabel"
          defaultMessage="Next"
        />
      </EuiButton>
    </Form>
  );
};
