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
  useFormData,
  Form,
  fieldFormatters,
  FormSchema,
  FIELD_TYPES,
  UseField,
  ToggleField,
  NumericField,
} from '../../../../../shared_imports';

import { useAppContext } from '../../../../app_context';
import { UnitField } from './unit_field';
import { updateDataRetention } from '../../../../services/api';

interface Props {
  dataRetention: string;
  dataStreamName: string;
  onClose: (data?: { hasUpdatedDataRetention: boolean }) => void;
}

const DEFAULT_DATA_RETENTION_PERIOD = '7d';

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
    formatters: [fieldFormatters.toInt],
    validations: [
      {
        validator: ({ value }) => {
          if (!value || value === 0) {
            return {
              message: i18n.translate(
                'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.dataRetentionFieldRequiredError',
                {
                  defaultMessage: 'A data retention value is required.',
                }
              ),
            };
          }
          if (value < 0) {
            return {
              message: i18n.translate(
                'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.dataRetentionFieldNonNegativeError',
                {
                  defaultMessage: `Data retention value can't be negative.`,
                }
              ),
            };
          }
        },
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
  infiniteRetentionPeriod: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    label: i18n.translate(
      'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.infiniteRetentionPeriodField',
      {
        defaultMessage: 'Never delete data',
      }
    ),
  },
};

const splitSizeAndUnits = (field: string): { size: string; unit: string } => {
  let size = '';
  let unit = '';

  const result = /(\d+)(\w+)/.exec(field);
  if (result) {
    size = result[1];
    unit = result[2];
  }

  return {
    size,
    unit,
  };
};

export const EditDataRetentionModal: React.FunctionComponent<Props> = ({
  dataRetention,
  dataStreamName,
  onClose,
}) => {
  const { size, unit } = splitSizeAndUnits(dataRetention || DEFAULT_DATA_RETENTION_PERIOD);
  const {
    services: { notificationService },
  } = useAppContext();

  const { form } = useForm({
    defaultValue: { dataRetention: size, timeUnit: unit, infiniteRetentionPeriod: !dataRetention },
    schema: configurationFormSchema,
    id: 'editDataRetentionForm',
  });
  const [formData] = useFormData({ form });

  const onSubmitForm = async () => {
    const { isValid, data } = await form.submit();

    if (!isValid) {
      return;
    }

    return updateDataRetention(dataStreamName, data).then(({ data: responseData, error }) => {
      if (responseData) {
        const successMessage = i18n.translate(
          'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.successDataRetentionNotification',
          { defaultMessage: 'Data retention updated' }
        );
        notificationService.showSuccessToast(successMessage);

        return onClose({ hasUpdatedDataRetention: true });
      }

      if (error) {
        const errorMessage = i18n.translate(
          'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.errorDataRetentionNotification',
          {
            defaultMessage: "Error updating data retention: '{error}'",
            values: { error: error.message },
          }
        );
        notificationService.showDangerToast(errorMessage);
      }

      onClose();
    });
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
                disabled: formData.infiniteRetentionPeriod,
                'data-test-subj': `policyNameField`,
                min: 1,
                append: (
                  <UnitField
                    path="timeUnit"
                    options={timeUnits}
                    disabled={formData.infiniteRetentionPeriod}
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

          <UseField path="infiniteRetentionPeriod" component={ToggleField} />

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
