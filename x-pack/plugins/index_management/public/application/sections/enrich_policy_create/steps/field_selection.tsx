/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiIconTip,
  EuiSpacer,
  EuiComboBoxOptionOption,
  EuiCallOut,
} from '@elastic/eui';
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
  onBack: () => void;
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

export const FieldSelectionStep = ({ onBack, onNext }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [fieldOptions, setFieldOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [matchFieldOptions, setMatchFieldOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const { draft, updateDraft, updateCompletionState } = useCreatePolicyContext();

  useEffect(() => {
    const fetchFields = async () => {
      setIsLoading(true);
      const { data } = await getFieldsFromIndices(draft.sourceIndices as string[]);
      setIsLoading(false);

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
    <Form form={form} data-test-subj="fieldSelectionForm">
      {!isLoading && hasSelectedMultipleIndices && matchFieldOptions.length === 0 && (
        <>
          <EuiCallOut
            title={i18n.translate('xpack.idxMgmt.enrichPolicyCreate.noCommonFieldsFoundError', {
              defaultMessage: 'No common fields',
            })}
            color="danger"
            iconType="error"
            data-test-subj="noCommonFieldsError"
          >
            <FormattedMessage
              id="xpack.idxMgmt.enrichPolicyCreate.fieldSelectionStep.matchFieldError"
              defaultMessage="The selected indices don't have any fields in common."
            />
          </EuiCallOut>

          <EuiSpacer />
        </>
      )}
      <UseField
        path="matchField"
        component={ComboBoxField}
        labelAppend={
          <EuiIconTip
            data-test-subj="matchFieldPopover"
            content={i18n.translate(
              'xpack.idxMgmt.enrichPolicyCreate.fieldSelectionStep.matchFieldPopover',
              {
                defaultMessage:
                  'The field in your source indices to match with the incoming documents.',
              }
            )}
          />
        }
        componentProps={{
          fullWidth: false,
          helpText: hasSelectedMultipleIndices
            ? i18n.translate(
                'xpack.idxMgmt.enrichPolicyCreate.fieldSelectionStep.matchFieldHelpText',
                {
                  defaultMessage:
                    'The match field must be the same across all selected source indices.',
                }
              )
            : undefined,
          euiFieldProps: {
            'data-test-subj': 'matchField',
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
        labelAppend={
          <EuiIconTip
            data-test-subj="enrichFieldsPopover"
            content={i18n.translate(
              'xpack.idxMgmt.enrichPolicyCreate.fieldSelectionStep.EnrichFieldsFieldPopover',
              {
                defaultMessage: 'The fields to add to your incoming documents.',
              }
            )}
          />
        }
        componentProps={{
          fullWidth: false,
          euiFieldProps: {
            'data-test-subj': 'enrichFields',
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

      <EuiFlexGroup
        data-test-subj="fieldSelectionStep"
        justifyContent="spaceBetween"
        style={{ maxWidth: 400 }}
      >
        <EuiFlexItem grow={false}>
          <EuiButton
            color="primary"
            iconSide="left"
            iconType="arrowLeft"
            data-test-subj="backButton"
            onClick={onBack}
          >
            <FormattedMessage
              id="xpack.idxMgmt.enrichPolicyCreate.fieldSelectionStep.backButtonLabel"
              defaultMessage="Back"
            />
          </EuiButton>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            color="primary"
            iconSide="right"
            iconType="arrowRight"
            disabled={form.isValid === false}
            data-test-subj="nextButton"
            onClick={onSubmit}
          >
            <FormattedMessage
              id="xpack.idxMgmt.enrichPolicyCreate.fieldSelectionStep.nextButtonLabel"
              defaultMessage="Next"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Form>
  );
};
