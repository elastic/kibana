/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ALL_SPACES_ID } from '@kbn/security-plugin/public';
import {
  EuiCheckbox,
  EuiComboBox,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext, useFormState } from 'react-hook-form';
import { SyntheticsParamSO } from '../../../../../../common/runtime_types';
import { ListParamItem } from './params_list';

export const AddParamForm = ({
  items,
  isEditingItem,
}: {
  items: ListParamItem[];
  isEditingItem: ListParamItem | null;
}) => {
  const { register, control } = useFormContext<SyntheticsParamSO>();
  const { errors } = useFormState<SyntheticsParamSO>();

  const tagsList = items.reduce((acc, item) => {
    const tags = item.tags || [];
    return new Set([...acc, ...tags]);
  }, new Set<string>());

  return (
    <EuiForm component="form" noValidate>
      <EuiFormRow
        fullWidth
        label={KEY_LABEL}
        isInvalid={Boolean(errors?.key)}
        error={errors?.key?.message}
      >
        <EuiFieldText
          data-test-subj="syntheticsAddParamFormFieldText"
          fullWidth
          aria-label={KEY_LABEL}
          {...register('key', {
            required: {
              value: true,
              message: KEY_REQUIRED,
            },
            validate: (val: string) => {
              return items
                .filter((param) => (isEditingItem ? param.id !== isEditingItem.id : true))
                .some((param) => param.key === val)
                ? KEY_EXISTS
                : undefined;
            },
          })}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={VALUE_LABEL}
        isInvalid={Boolean(errors?.value)}
        error={errors?.value?.message}
      >
        <EuiTextArea
          data-test-subj="syntheticsAddParamFormTextArea"
          fullWidth
          aria-label={VALUE_LABEL}
          {...register('value', {
            required: {
              value: true,
              message: VALUE_REQUIRED,
            },
          })}
        />
      </EuiFormRow>
      <EuiFormRow fullWidth label={TAGS_LABEL}>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => (
            <EuiComboBox
              fullWidth
              aria-label={TAGS_LABEL}
              placeholder={TAGS_LABEL}
              isInvalid={!!errors?.tags}
              selectedOptions={field.value?.map((tag) => ({ label: tag, value: tag })) ?? []}
              options={[...tagsList].map((tag) => ({ label: tag, value: tag }))}
              onCreateOption={(newTag) => {
                field.onChange([...(field.value ?? []), newTag]);
              }}
              {...field}
              onChange={(selectedTags) => {
                field.onChange(selectedTags.map((tag) => tag.value));
              }}
            />
          )}
        />
      </EuiFormRow>
      <EuiFormRow fullWidth label={DESCRIPTION_LABEL}>
        <EuiFieldText
          data-test-subj="syntheticsAddParamFormFieldText"
          fullWidth
          aria-label={DESCRIPTION_LABEL}
          {...register('description', {})}
        />
      </EuiFormRow>
      <EuiFormRow fullWidth label={NAMESPACES_LABEL}>
        <Controller
          name="namespaces"
          render={({ field }) => (
            <EuiCheckbox
              id="isShared"
              label={SHARED_LABEL}
              aria-label={NAMESPACES_LABEL}
              onChange={(e) => {
                if (e.target.checked) {
                  field.onChange([ALL_SPACES_ID]);
                } else {
                  field.onChange([]);
                }
              }}
              checked={(field.value ?? []).length > 0 && (field.value ?? [])[0] === '*'}
              disabled={Boolean(isEditingItem)}
            />
          )}
        />
      </EuiFormRow>
    </EuiForm>
  );
};

export const KEY_LABEL = i18n.translate('xpack.synthetics.monitorManagement.paramForm.keyLabel', {
  defaultMessage: 'Key',
});

export const TAGS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.paramForm.tagsLabel', {
  defaultMessage: 'Tags',
});

export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.paramForm.descriptionLabel',
  {
    defaultMessage: 'Description',
  }
);

export const SHARED_LABEL = i18n.translate('xpack.synthetics.paramForm.sharedAcrossSpacesLabel', {
  defaultMessage: 'Share across spaces',
});

export const NAMESPACES_LABEL = i18n.translate('xpack.synthetics.paramForm.namespaces', {
  defaultMessage: 'Namespaces',
});

export const VALUE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.paramForm.paramLabel',
  {
    defaultMessage: 'Value',
  }
);

const KEY_REQUIRED = i18n.translate('xpack.synthetics.monitorManagement.param.keyRequired', {
  defaultMessage: 'Key is required',
});

const KEY_EXISTS = i18n.translate('xpack.synthetics.monitorManagement.param.keyExists', {
  defaultMessage: 'Key already exists',
});

const VALUE_REQUIRED = i18n.translate('xpack.synthetics.monitorManagement.value.required', {
  defaultMessage: 'Value is required',
});
