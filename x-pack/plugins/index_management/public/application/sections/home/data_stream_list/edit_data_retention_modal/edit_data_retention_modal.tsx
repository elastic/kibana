/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  useForm,
  Form,
  fieldValidators,
  FormSchema,
  FIELD_TYPES,
  UseField,
  NumericField,
} from '../../../../../shared_imports';
import { UnitField } from './unit_field';

interface Props {
  onClose: (data?: { hasDeletedDataStreams: boolean }) => void;
}

export const timeUnits = [
  {
    value: 'd',
    text: i18n.translate(
      'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.timeUnits.daysLabel',
      {
        defaultMessage: 'Days',
      }
    ),
  },
  {
    value: 'h',
    text: i18n.translate(
      'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.timeUnits.hoursLabel',
      {
        defaultMessage: 'Hours',
      }
    ),
  },
  {
    value: 'm',
    text: i18n.translate(
      'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.timeUnits.minutesLabel',
      {
        defaultMessage: 'Minutes',
      }
    ),
  },
  {
    value: 's',
    text: i18n.translate(
      'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.timeUnits.secondsLabel',
      {
        defaultMessage: 'Seconds',
      }
    ),
  },
  {
    value: 'ms',
    text: i18n.translate(
      'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.timeUnits.millisecondsLabel',
      {
        defaultMessage: 'Milliseconds',
      }
    ),
  },
  {
    value: 'micros',
    text: i18n.translate(
      'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.timeUnits.microsecondsLabel',
      {
        defaultMessage: 'Microseconds',
      }
    ),
  },
  {
    value: 'nanos',
    text: i18n.translate(
      'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.timeUnits.nanosecondsLabel',
      {
        defaultMessage: 'Nanoseconds',
      }
    ),
  },
];

const configurationFormSchema: FormSchema = {
  dataRetention: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate(
      'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.dataRetentionField',
      {
        defaultMessage: 'Data retention',
      }
    ),
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.translate(
            'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.dataRetentionFieldRequiredError',
            {
              defaultMessage: 'A data retention value is required.',
            }
          )
        ),
      },
    ],
  },
  timeUnit: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate(
      'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.timeUnitField',
      {
        defaultMessage: 'Time unit',
      }
    ),
  },
};

export const EditDataRetentionModal: React.FunctionComponent<Props> = ({
  onClose,
}: {
  onClose: (data?: { hasDeletedDataStreams: boolean }) => void;
}) => {
  const { form } = useForm({
    defaultValue: { timeUnit: 'd' },
    schema: configurationFormSchema,
    id: 'editDataRetentionForm',
  });

  const onSubmitForm = async () => {
    const { isValid, data } = await form.submit();

    if (!isValid) {
      return;
    }

    console.log('submit:');
    console.log(data);
  };

  return (
    <EuiModal onClose={() => onClose()} data-test-subj="editDataRetentionModal">
      <Form form={form} data-test-subj="editDataRetentionForm">
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.modalTitleText"
              defaultMessage="Edit data retention"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <UseField
            path="dataRetention"
            component={NumericField}
            componentProps={{
              fullWidth: false,
              euiFieldProps: {
                'data-test-subj': `policyNameField`,
                min: 1,
                append: (
                  <UnitField
                    path="timeUnit"
                    options={timeUnits}
                    euiFieldProps={{
                      'data-test-subj': 'timeUnit',
                      'aria-label': i18n.translate(
                        'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.unitsAriaLabel',
                        {
                          defaultMessage: 'Time unit',
                        }
                      ),
                    }}
                  />
                ),
              },
            }}
          />

          <EuiSpacer />
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty data-test-subj="cancelButton" onClick={() => onClose()}>
            <FormattedMessage
              id="xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>

          <EuiButton
            fill
            type="submit"
            isLoading={false}
            disabled={form.isValid === false}
            data-test-subj="saveButton"
            onClick={onSubmitForm}
          >
            <FormattedMessage
              id="xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.saveButtonLabel"
              defaultMessage="Save"
            />
          </EuiButton>
        </EuiModalFooter>
      </Form>
    </EuiModal>
  );
};
