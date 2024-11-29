/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
  EuiLink,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';
import { has } from 'lodash';
import { ScopedHistory } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { isBiggerThanGlobalMaxRetention } from './validations';
import {
  useForm,
  useFormData,
  useFormIsModified,
  Form,
  fieldFormatters,
  FormSchema,
  FIELD_TYPES,
  UseField,
  ToggleField,
  NumericField,
  fieldValidators,
} from '../../../../../shared_imports';

import { reactRouterNavigate } from '../../../../../shared_imports';
import { getIndexListUri } from '../../../../services/routing';
import { documentationService } from '../../../../services/documentation';
import { splitSizeAndUnits, DataStream } from '../../../../../../common';
import { timeUnits } from '../../../../constants/time_units';
import { deserializeGlobalMaxRetention, isDSLWithILMIndices } from '../../../../lib/data_streams';
import { useAppContext } from '../../../../app_context';
import { UnitField } from '../../../../components/shared';
import { updateDataRetention } from '../../../../services/api';

interface Props {
  dataStream: DataStream;
  ilmPolicyName?: string;
  ilmPolicyLink: string;
  onClose: (data?: { hasUpdatedDataRetention: boolean }) => void;
}

const configurationFormSchema: FormSchema = {
  dataRetention: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate(
      'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.dataRetentionField',
      {
        defaultMessage: 'Data retention period',
      }
    ),
    formatters: [fieldFormatters.toInt],
    validations: [
      {
        validator: fieldValidators.isInteger({
          message: i18n.translate(
            'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.dataRetentionFieldIntegerError',
            {
              defaultMessage: 'Only integers are allowed.',
            }
          ),
        }),
      },
      {
        validator: ({ value, formData, customData }) => {
          // We only need to validate the data retention field if infiniteRetentionPeriod is set to false
          if (!formData.infiniteRetentionPeriod) {
            // If project level data retention is enabled, we need to enforce the global max retention
            const { globalMaxRetention, enableProjectLevelRetentionChecks } =
              customData.value as any;
            if (enableProjectLevelRetentionChecks) {
              return isBiggerThanGlobalMaxRetention(value, formData.timeUnit, globalMaxRetention);
            }
          }
        },
      },
      {
        validator: (args) => {
          // We only need to validate the data retention field if infiniteRetentionPeriod is set to false
          if (!args.formData.infiniteRetentionPeriod) {
            return fieldValidators.emptyField(
              i18n.translate(
                'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.dataRetentionFieldRequiredError',
                {
                  defaultMessage: 'A data retention value is required.',
                }
              )
            )(args);
          }
        },
      },
      {
        validator: (args) => {
          // We only need to validate the data retention field if infiniteRetentionPeriod is set to false
          if (!args.formData.infiniteRetentionPeriod) {
            return fieldValidators.numberGreaterThanField({
              than: 0,
              allowEquality: false,
              message: i18n.translate(
                'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.dataRetentionFieldNonNegativeError',
                {
                  defaultMessage: `A positive value is required.`,
                }
              ),
            })(args);
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
  },
  dataRetentionEnabled: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    label: i18n.translate(
      'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.dataRetentionEnabledField',
      {
        defaultMessage: 'Enable data retention',
      }
    ),
  },
};

interface MixedIndicesCalloutProps {
  history: ScopedHistory;
  ilmPolicyLink: string;
  ilmPolicyName?: string;
  dataStreamName: string;
}

const MixedIndicesCallout = ({
  ilmPolicyLink,
  ilmPolicyName,
  dataStreamName,
  history,
}: MixedIndicesCalloutProps) => {
  const { core } = useAppContext();

  return (
    <EuiCallOut
      title={i18n.translate(
        'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.someManagedByILMTitle',
        { defaultMessage: 'Some indices are managed by ILM' }
      )}
      color="warning"
      iconType="warning"
      data-test-subj="someIndicesAreManagedByILMCallout"
    >
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.someManagedByILMBody"
          defaultMessage="One or more indices are managed by an ILM policy ({viewAllIndicesLink}). Updating data retention for this data stream won't affect these indices. Instead you will have to update the {ilmPolicyLink} policy."
          values={{
            ilmPolicyLink: (
              <EuiLink
                data-test-subj="viewIlmPolicyLink"
                onClick={() => core.application.navigateToUrl(ilmPolicyLink)}
              >
                {ilmPolicyName}
              </EuiLink>
            ),
            viewAllIndicesLink: (
              <EuiLink
                {...reactRouterNavigate(
                  history,
                  getIndexListUri(`data_stream="${dataStreamName}"`, true)
                )}
                data-test-subj="viewAllIndicesLink"
              >
                <FormattedMessage
                  id="xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.viewAllIndices"
                  defaultMessage="view indices"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiCallOut>
  );
};

export const EditDataRetentionModal: React.FunctionComponent<Props> = ({
  dataStream,
  ilmPolicyName,
  ilmPolicyLink,
  onClose,
}) => {
  const lifecycle = dataStream?.lifecycle;
  const dataStreamName = dataStream?.name as string;

  const { history } = useAppContext();
  const dslWithIlmIndices = isDSLWithILMIndices(dataStream);
  const { size, unit } = splitSizeAndUnits(lifecycle?.data_retention as string);
  const globalMaxRetention = deserializeGlobalMaxRetention(lifecycle?.globalMaxRetention);
  const {
    services: { notificationService },
    config: { enableTogglingDataRetention, enableProjectLevelRetentionChecks },
  } = useAppContext();

  const { form } = useForm({
    defaultValue: {
      dataRetention: size,
      timeUnit: unit || 'd',
      dataRetentionEnabled: lifecycle?.enabled,
      // When data retention is not set and lifecycle is enabled, is the only scenario in
      // which data retention will be infinite. If lifecycle isnt set or is not enabled, we
      // dont have inifinite data retention.
      infiniteRetentionPeriod: lifecycle?.enabled && !lifecycle?.data_retention,
    },
    schema: configurationFormSchema,
    id: 'editDataRetentionForm',
  });
  const [formData] = useFormData({ form });
  const isDirty = useFormIsModified({ form });

  const formHasErrors = form.getErrors().length > 0;
  const disableSubmit = formHasErrors || !isDirty || form.isValid === false;

  // Whenever the timeUnit field changes, we need to re-validate
  // the dataRetention field
  useEffect(() => {
    form.validateFields(['dataRetention']);
  }, [formData.timeUnit, form]);

  const onSubmitForm = async () => {
    const { isValid, data } = await form.submit();

    if (!isValid) {
      return;
    }

    // When enableTogglingDataRetention is disabled (ie: serverless) we don't mount
    // the dataRetentionEnabled field in the UI, which means that the form state for
    // this field regardless if it has defaultValue or if its set with form.setValue.
    // This seems to be a design decision from the formlib and there doesnt seem to
    // be a way around it AFAICT.
    // So when that happens we want to make sure that the dataRetention is always enabled.
    if (!has(data, 'dataRetentionEnabled')) {
      data.dataRetentionEnabled = true;
    }

    return updateDataRetention(dataStreamName, data).then(({ data: responseData, error }) => {
      if (responseData) {
        // If the response came back with a warning from ES, rely on that for the
        // toast message.
        if (responseData.warning) {
          notificationService.showWarningToast(responseData.warning);
          return onClose({ hasUpdatedDataRetention: true });
        }

        const successMessage = i18n.translate(
          'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.successDataRetentionNotification',
          {
            defaultMessage:
              'Data retention {disabledDataRetention, plural, one { disabled } other { updated } }',
            values: { disabledDataRetention: !data.dataRetentionEnabled ? 1 : 0 },
          }
        );
        notificationService.showSuccessToast(successMessage);

        return onClose({ hasUpdatedDataRetention: true });
      }

      if (error) {
        const errorMessage = i18n.translate(
          'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.errorDataRetentionNotification',
          {
            defaultMessage: "Error updating data retention: ''{error}''",
            values: { error: error.message },
          }
        );
        notificationService.showDangerToast(errorMessage);
      }

      onClose();
    });
  };

  return (
    <EuiModal
      onClose={() => onClose()}
      data-test-subj="editDataRetentionModal"
      css={{ minWidth: 450 }}
    >
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
          {dslWithIlmIndices && (
            <>
              <MixedIndicesCallout
                history={history}
                ilmPolicyLink={ilmPolicyLink}
                ilmPolicyName={ilmPolicyName}
                dataStreamName={dataStreamName}
              />
              <EuiSpacer />
            </>
          )}

          {enableProjectLevelRetentionChecks && lifecycle?.globalMaxRetention && (
            <>
              <FormattedMessage
                id="xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.modalTitleText"
                defaultMessage="Maximum data retention period is {maxRetention} {unitText}"
                values={{
                  maxRetention: globalMaxRetention.size,
                  unitText: globalMaxRetention.unitText,
                }}
              />
              <EuiSpacer />
            </>
          )}

          {enableTogglingDataRetention && (
            <UseField
              path="dataRetentionEnabled"
              component={ToggleField}
              data-test-subj="dataRetentionEnabledField"
            />
          )}

          <UseField
            path="dataRetention"
            component={NumericField}
            validationData={{
              globalMaxRetention: lifecycle?.globalMaxRetention,
              enableProjectLevelRetentionChecks,
            }}
            labelAppend={
              <EuiText size="xs">
                <EuiLink href={documentationService.getUpdateExistingDS()} target="_blank" external>
                  {i18n.translate(
                    'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.learnMoreLinkText',
                    {
                      defaultMessage: 'How does this work?',
                    }
                  )}
                </EuiLink>
              </EuiText>
            }
            componentProps={{
              fullWidth: false,
              euiFieldProps: {
                disabled:
                  formData.infiniteRetentionPeriod ||
                  (!formData.dataRetentionEnabled && enableTogglingDataRetention),
                'data-test-subj': `dataRetentionValue`,
                min: 1,
                append: (
                  <UnitField
                    path="timeUnit"
                    options={timeUnits}
                    disabled={
                      formData.infiniteRetentionPeriod ||
                      (!formData.dataRetentionEnabled && enableTogglingDataRetention)
                    }
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

          <UseField
            path="infiniteRetentionPeriod"
            component={ToggleField}
            data-test-subj="infiniteRetentionPeriod"
            label={i18n.translate(
              'xpack.idxMgmt.dataStreamsDetailsPanel.editDataRetentionModal.infiniteRetentionPeriodField',
              {
                defaultMessage:
                  'Keep data {withProjectLevelRetention, plural, one {up to maximum retention period} other {indefinitely}}',
                values: { withProjectLevelRetention: enableProjectLevelRetentionChecks ? 1 : 0 },
              }
            )}
            componentProps={{
              euiFieldProps: {
                disabled: !formData.dataRetentionEnabled && enableTogglingDataRetention,
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
            disabled={disableSubmit}
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
