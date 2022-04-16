/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, ReactNode } from 'react';
import { flow } from 'fp-ts/lib/function';
import { map } from 'fp-ts/lib/Array';

import {
  FieldValidateResponse,
  VALIDATION_TYPES,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  FIELD_TYPES,
  FieldConfig,
  UseField,
  fieldValidators,
  useKibana,
} from '../../../../../../../shared_imports';

import { getProcessorDescriptor, mapProcessorTypeToDescriptor } from '../../../shared';

const extractProcessorTypesAndLabels = flow(
  Object.entries,
  map(([type, { label }]) => ({
    label,
    value: type,
  })),
  (arr) => arr.sort((a, b) => a.label.localeCompare(b.label))
);

interface ProcessorTypeAndLabel {
  value: string;
  label: string;
}

const processorTypesAndLabels: ProcessorTypeAndLabel[] = extractProcessorTypesAndLabels(
  mapProcessorTypeToDescriptor
);

interface Props {
  initialType?: string;
}

const { emptyField } = fieldValidators;

const typeConfig: FieldConfig<string> = {
  type: FIELD_TYPES.COMBO_BOX,
  label: i18n.translate('xpack.ingestPipelines.pipelineEditor.typeField.typeFieldLabel', {
    defaultMessage: 'Processor',
  }),
  deserializer: String,
  validations: [
    {
      validator: emptyField(
        i18n.translate('xpack.ingestPipelines.pipelineEditor.typeField.fieldRequiredError', {
          defaultMessage: 'A type is required.',
        })
      ),
    },
  ],
};

export const ProcessorTypeField: FunctionComponent<Props> = ({ initialType }) => {
  const {
    services: { documentation },
  } = useKibana();
  const esDocUrl = documentation.getEsDocsBasePath();
  return (
    <UseField<string> config={typeConfig} defaultValue={initialType} path="type">
      {(typeField) => {
        let selectedOptions: ProcessorTypeAndLabel[];
        let description: string | ReactNode = '';

        if (typeField.value?.length) {
          const type = typeField.value;
          const processorDescriptor = getProcessorDescriptor(type);
          if (processorDescriptor) {
            description = processorDescriptor.typeDescription || '';
            selectedOptions = [{ label: processorDescriptor.label, value: type }];
          } else {
            // If there is no label for this processor type, just use the type as the label
            selectedOptions = [{ label: type, value: type }];
          }
        } else {
          selectedOptions = [];
        }

        const error = typeField.getErrorsMessages();
        const isInvalid = error ? Boolean(error.length) : false;

        const onCreateComboOption = (value: string) => {
          // Note: for now, all validations for a comboBox array item have to be synchronous
          // If there is a need to support asynchronous validation, we'll work on it (and will need to update the <EuiComboBox /> logic).
          const { isValid } = typeField.validate({
            value,
            validationType: VALIDATION_TYPES.ARRAY_ITEM,
          }) as FieldValidateResponse;

          if (!isValid) {
            // Return false to explicitly reject the user's input.
            return false;
          }

          typeField.setValue(value);
        };

        return (
          <EuiFormRow
            label={typeField.label}
            labelAppend={typeField.labelAppend}
            helpText={typeof description === 'function' ? description(esDocUrl) : description}
            error={error}
            isInvalid={isInvalid}
            fullWidth
            data-test-subj="processorTypeSelector"
          >
            <EuiComboBox
              fullWidth
              placeholder={i18n.translate(
                'xpack.ingestPipelines.pipelineEditor.typeField.typeFieldComboboxPlaceholder',
                {
                  defaultMessage: 'Type and then hit "ENTER"',
                }
              )}
              options={processorTypesAndLabels}
              selectedOptions={selectedOptions}
              onCreateOption={onCreateComboOption}
              onChange={(options: Array<EuiComboBoxOptionOption<string>>) => {
                const [selection] = options;
                typeField.setValue(selection?.value! ?? '');
              }}
              noSuggestions={false}
              singleSelection={{
                asPlainText: true,
              }}
              data-test-subj="input"
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};
