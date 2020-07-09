/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiOverlayMask,
  EuiSelect,
  EuiTitle,
} from '@elastic/eui';

import { useMlKibana } from '../../../../../contexts/kibana';
import { ml } from '../../../../../services/ml_api_service';
import {
  memoryInputValidator,
  MemoryInputValidatorResult,
} from '../../../../../../../common/util/validators';
import { extractErrorMessage } from '../../../../../../../common/util/errors';
import { DATA_FRAME_TASK_STATE } from '../analytics_list/common';
import {
  useRefreshAnalyticsList,
  UpdateDataFrameAnalyticsConfig,
} from '../../../../common/analytics';

import { EditAction } from './use_edit_action';

let mmLValidator: (value: any) => MemoryInputValidatorResult;

export const EditButtonFlyout: FC<Required<EditAction>> = ({ closeFlyout, item }) => {
  const { id: jobId, config } = item;
  const { state } = item.stats;
  const initialAllowLazyStart =
    config.allow_lazy_start !== undefined ? String(config.allow_lazy_start) : '';

  const [allowLazyStart, setAllowLazyStart] = useState<string>(initialAllowLazyStart);
  const [description, setDescription] = useState<string>(config.description || '');
  const [modelMemoryLimit, setModelMemoryLimit] = useState<string>(config.model_memory_limit);
  const [mmlValidationError, setMmlValidationError] = useState<string | undefined>();

  const {
    services: { notifications },
  } = useMlKibana();
  const { refresh } = useRefreshAnalyticsList();

  // Disable if mml is not valid
  const updateButtonDisabled = mmlValidationError !== undefined;

  useEffect(() => {
    if (mmLValidator === undefined) {
      mmLValidator = memoryInputValidator();
    }
    // validate mml and create validation message
    if (modelMemoryLimit !== '') {
      const validationResult = mmLValidator(modelMemoryLimit);
      if (validationResult !== null && validationResult.invalidUnits) {
        setMmlValidationError(
          i18n.translate('xpack.ml.dataframe.analytics.create.modelMemoryUnitsInvalidError', {
            defaultMessage: 'Model memory limit data unit unrecognized. It must be {str}',
            values: { str: validationResult.invalidUnits.allowedUnits },
          })
        );
      } else {
        setMmlValidationError(undefined);
      }
    } else {
      setMmlValidationError(
        i18n.translate('xpack.ml.dataframe.analytics.create.modelMemoryEmptyError', {
          defaultMessage: 'Model memory limit must not be empty',
        })
      );
    }
  }, [modelMemoryLimit]);

  const onSubmit = async () => {
    const updateConfig: UpdateDataFrameAnalyticsConfig = Object.assign(
      {
        allow_lazy_start: allowLazyStart,
        description,
      },
      modelMemoryLimit && { model_memory_limit: modelMemoryLimit }
    );

    try {
      await ml.dataFrameAnalytics.updateDataFrameAnalytics(jobId, updateConfig);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.ml.dataframe.analyticsList.editFlyoutSuccessMessage', {
          defaultMessage: 'Analytics job {jobId} has been updated.',
          values: { jobId },
        })
      );
      refresh();
      closeFlyout();
    } catch (e) {
      // eslint-disable-next-line
      console.error(e);

      notifications.toasts.addDanger({
        title: i18n.translate('xpack.ml.dataframe.analyticsList.editFlyoutErrorMessage', {
          defaultMessage: 'Could not save changes to analytics job {jobId}',
          values: {
            jobId,
          },
        }),
        text: extractErrorMessage(e),
      });
    }
  };

  return (
    <EuiOverlayMask>
      <EuiFlyout
        onClose={closeFlyout}
        hideCloseButton
        aria-labelledby="analyticsEditFlyoutTitle"
        data-test-subj="analyticsEditFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="analyticsEditFlyoutTitle">
              {i18n.translate('xpack.ml.dataframe.analyticsList.editFlyoutTitle', {
                defaultMessage: 'Edit {jobId}',
                values: {
                  jobId,
                },
              })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiForm>
            <EuiFormRow
              label={i18n.translate(
                'xpack.ml.dataframe.analyticsList.editFlyout.allowLazyStartLabel',
                {
                  defaultMessage: 'Allow lazy start',
                }
              )}
            >
              <EuiSelect
                aria-label={i18n.translate(
                  'xpack.ml.dataframe.analyticsList.editFlyout.allowLazyStartAriaLabel',
                  {
                    defaultMessage: 'Update allow lazy start.',
                  }
                )}
                data-test-subj="mlAnalyticsEditFlyoutAllowLazyStartInput"
                options={[
                  {
                    value: 'true',
                    text: i18n.translate(
                      'xpack.ml.dataframe.analyticsList.editFlyout.allowLazyStartTrueValue',
                      {
                        defaultMessage: 'True',
                      }
                    ),
                  },
                  {
                    value: 'false',
                    text: i18n.translate(
                      'xpack.ml.dataframe.analyticsList.editFlyout.allowLazyStartFalseValue',
                      {
                        defaultMessage: 'False',
                      }
                    ),
                  },
                ]}
                value={allowLazyStart}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setAllowLazyStart(e.target.value)
                }
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.translate(
                'xpack.ml.dataframe.analyticsList.editFlyout.descriptionLabel',
                {
                  defaultMessage: 'Description',
                }
              )}
            >
              <EuiFieldText
                data-test-subj="mlAnalyticsEditFlyoutDescriptionInput"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                aria-label={i18n.translate(
                  'xpack.ml.dataframe.analyticsList.editFlyout.descriptionAriaLabel',
                  {
                    defaultMessage: 'Update the job description.',
                  }
                )}
              />
            </EuiFormRow>
            <EuiFormRow
              helpText={
                state !== DATA_FRAME_TASK_STATE.STOPPED &&
                i18n.translate('xpack.ml.dataframe.analyticsList.editFlyout.modelMemoryHelpText', {
                  defaultMessage: 'Model memory limit cannot be edited while the job is running.',
                })
              }
              label={i18n.translate(
                'xpack.ml.dataframe.analyticsList.editFlyout.modelMemoryLimitLabel',
                {
                  defaultMessage: 'Model memory limit',
                }
              )}
              isInvalid={mmlValidationError !== undefined}
              error={mmlValidationError}
            >
              <EuiFieldText
                data-test-subj="mlAnalyticsEditFlyoutmodelMemoryLimitInput"
                isInvalid={mmlValidationError !== undefined}
                readOnly={state !== DATA_FRAME_TASK_STATE.STOPPED}
                value={modelMemoryLimit}
                onChange={(e) => setModelMemoryLimit(e.target.value)}
                aria-label={i18n.translate(
                  'xpack.ml.dataframe.analyticsList.editFlyout.modelMemoryLimitAriaLabel',
                  {
                    defaultMessage: 'Update the model memory limit.',
                  }
                )}
              />
            </EuiFormRow>
          </EuiForm>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
                {i18n.translate('xpack.ml.dataframe.analyticsList.editFlyoutCancelButtonText', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="analyticsEditFlyoutUpdateButton"
                onClick={onSubmit}
                fill
                isDisabled={updateButtonDisabled}
              >
                {i18n.translate('xpack.ml.dataframe.analyticsList.editFlyoutUpdateButtonText', {
                  defaultMessage: 'Update',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiOverlayMask>
  );
};
