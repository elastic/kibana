/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import type { CreateSLOInput } from '@kbn/slo-schema';

export function SloEditFormDescription() {
  const { control } = useFormContext<CreateSLOInput>();
  const sloNameId = useGeneratedHtmlId({ prefix: 'sloName' });
  const descriptionId = useGeneratedHtmlId({ prefix: 'sloDescription' });
  const tagsId = useGeneratedHtmlId({ prefix: 'tags' });

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <EuiFormLabel>
          {i18n.translate('xpack.observability.slo.sloEdit.description.sloName', {
            defaultMessage: 'SLO Name',
          })}
        </EuiFormLabel>

        <Controller
          name="name"
          control={control}
          rules={{ required: true }}
          render={({ field: { ref, ...field } }) => (
            <EuiFieldText
              fullWidth
              id={sloNameId}
              data-test-subj="sloFormNameInput"
              placeholder={i18n.translate(
                'xpack.observability.slo.sloEdit.description.sloNamePlaceholder',
                {
                  defaultMessage: 'Name for the SLO',
                }
              )}
              {...field}
            />
          )}
        />
      </EuiFlexItem>

      <EuiFlexItem grow>
        <EuiFormLabel>
          {i18n.translate('xpack.observability.slo.sloEdit.description.sloDescription', {
            defaultMessage: 'Description',
          })}
        </EuiFormLabel>

        <Controller
          name="description"
          defaultValue=""
          control={control}
          render={({ field: { ref, ...field } }) => (
            <EuiTextArea
              fullWidth
              id={descriptionId}
              data-test-subj="sloFormDescriptionTextArea"
              placeholder={i18n.translate(
                'xpack.observability.slo.sloEdit.description.sloDescriptionPlaceholder',
                {
                  defaultMessage: 'A short description of the SLO',
                }
              )}
              {...field}
            />
          )}
        />
      </EuiFlexItem>

      <EuiFlexItem grow>
        <EuiFormLabel>
          {i18n.translate('xpack.observability.slo.sloEdit.tags.label', {
            defaultMessage: 'Tags',
          })}
        </EuiFormLabel>
        <Controller
          shouldUnregister={true}
          name="tags"
          control={control}
          defaultValue={[]}
          rules={{ required: false }}
          render={({ field: { ref, ...field }, fieldState }) => (
            <EuiComboBox
              {...field}
              id={tagsId}
              fullWidth
              aria-label={i18n.translate('xpack.observability.slo.sloEdit.tags.placeholder', {
                defaultMessage: 'Add tags',
              })}
              placeholder={i18n.translate('xpack.observability.slo.sloEdit.tags.placeholder', {
                defaultMessage: 'Add tags',
              })}
              isInvalid={!!fieldState.error}
              options={[]}
              noSuggestions
              selectedOptions={generateTagOptions(field.value)}
              onChange={(selected: EuiComboBoxOptionOption[]) => {
                if (selected.length) {
                  return field.onChange(selected.map((opts) => opts.value));
                }

                field.onChange([]);
              }}
              onCreateOption={(searchValue: string, options: EuiComboBoxOptionOption[] = []) => {
                const normalizedSearchValue = searchValue.trim().toLowerCase();

                if (!normalizedSearchValue) {
                  return;
                }
                const values = field.value ?? [];

                if (
                  values.findIndex((tag) => tag.trim().toLowerCase() === normalizedSearchValue) ===
                  -1
                ) {
                  field.onChange([...values, searchValue]);
                }
              }}
              isClearable={true}
              data-test-subj="sloEditApmAvailabilityGoodStatusCodesSelector"
            />
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function generateTagOptions(tags: string[] = []) {
  return tags.map((tag) => ({
    label: tag,
    value: tag,
    'data-test-subj': `${tag}Option`,
  }));
}
