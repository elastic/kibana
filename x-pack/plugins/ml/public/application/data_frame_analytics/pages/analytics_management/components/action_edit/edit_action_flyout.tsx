/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
} from '@elastic/eui';

import type { MlUrlConfig } from '@kbn/ml-anomaly-utils';
import {
  DATA_FRAME_TASK_STATE,
  type DataFrameAnalyticsConfig,
  type UpdateDataFrameAnalyticsConfig,
} from '@kbn/ml-data-frame-analytics-utils';

import { useMlKibana, useMlApi } from '../../../../../contexts/kibana';
import { useToastNotificationService } from '../../../../../services/toast_notification_service';
import type { MemoryInputValidatorResult } from '../../../../../../../common/util/validators';
import { memoryInputValidator } from '../../../../../../../common/util/validators';
import { useRefreshAnalyticsList } from '../../../../common/analytics';

import type { EditAction } from './use_edit_action';
import { CustomUrlsWrapper, isValidCustomUrls } from '../../../../../components/custom_urls';

let mmLValidator: (value: any) => MemoryInputValidatorResult;

export const EditActionFlyout: FC<Required<EditAction>> = ({ closeFlyout, item }) => {
  const { id: jobId, config } = item;
  const { state } = item.stats;
  const initialAllowLazyStart =
    config.allow_lazy_start !== undefined ? String(config.allow_lazy_start) : '';

  const [allowLazyStart, setAllowLazyStart] = useState<string>(initialAllowLazyStart);
  const [description, setDescription] = useState<string>(config.description || '');
  const [modelMemoryLimit, setModelMemoryLimit] = useState<string | undefined>(
    config.model_memory_limit
  );
  const [mmlValidationError, setMmlValidationError] = useState<string | undefined>();
  const [maxNumThreads, setMaxNumThreads] = useState<number | undefined>(config.max_num_threads);
  const [activeTabId, setActiveTabId] = useState<string>('job-details');
  const [customUrls, setCustomUrls] = useState<MlUrlConfig[]>([]);
  const [analyticsJob, setAnalyticsJob] = useState<DataFrameAnalyticsConfig | undefined>();

  const {
    services: { notifications },
  } = useMlKibana();
  const { refresh } = useRefreshAnalyticsList();

  const mlApi = useMlApi();
  const {
    dataFrameAnalytics: { getDataFrameAnalytics },
  } = mlApi;

  const toastNotificationService = useToastNotificationService();

  // Disable if mml is not valid
  const updateButtonDisabled = mmlValidationError !== undefined || maxNumThreads === 0;

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

  useEffect(
    function fetchAnalyticsJob() {
      getDataFrameAnalytics(jobId).then((resp) => {
        if (resp.data_frame_analytics.length) {
          const job = resp.data_frame_analytics[0];
          setAnalyticsJob(job);
          if (job._meta?.custom_urls) {
            setCustomUrls(job._meta.custom_urls);
          }
        }
      });
    },
    [jobId, getDataFrameAnalytics]
  );

  const updateDataFrameAnalytics = async (updateConfig: UpdateDataFrameAnalyticsConfig) => {
    try {
      await mlApi.dataFrameAnalytics.updateDataFrameAnalytics(jobId, updateConfig);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.ml.dataframe.analyticsList.editFlyoutSuccessMessage', {
          defaultMessage: 'Analytics job {jobId} has been updated.',
          values: { jobId },
        })
      );
      refresh();
      closeFlyout();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);

      toastNotificationService.displayErrorToast(
        e,
        i18n.translate('xpack.ml.dataframe.analyticsList.editFlyoutErrorMessage', {
          defaultMessage: 'Could not save changes to analytics job {jobId}',
          values: {
            jobId,
          },
        })
      );
    }
  };

  const onSubmit = async () => {
    if (activeTabId === 'job-details') {
      const updateConfig: UpdateDataFrameAnalyticsConfig = Object.assign(
        {
          allow_lazy_start: allowLazyStart,
          description,
        },
        modelMemoryLimit && { model_memory_limit: modelMemoryLimit },
        maxNumThreads && { max_num_threads: maxNumThreads }
      );
      await updateDataFrameAnalytics(updateConfig);
    } else if (activeTabId === 'custom-urls') {
      const meta = analyticsJob?._meta ?? {};
      delete meta.custom_urls;
      // Only update custom urls and leave anything else in _meta untouched
      const updateConfig: UpdateDataFrameAnalyticsConfig = {
        _meta: { ...meta, custom_urls: customUrls },
      };
      await updateDataFrameAnalytics(updateConfig);
    }
  };

  const jobDetailsContent = (
    <>
      <EuiSpacer />
      <EuiForm>
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.analyticsList.editFlyout.allowLazyStartLabel', {
            defaultMessage: 'Allow lazy start',
          })}
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
          label={i18n.translate('xpack.ml.dataframe.analyticsList.editFlyout.descriptionLabel', {
            defaultMessage: 'Description',
          })}
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
              defaultMessage: 'Model memory limit cannot be edited until the job has stopped.',
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
        <EuiFormRow
          helpText={
            state !== DATA_FRAME_TASK_STATE.STOPPED &&
            i18n.translate('xpack.ml.dataframe.analyticsList.editFlyout.maxNumThreadsHelpText', {
              defaultMessage:
                'Maximum number of threads cannot be edited until the job has stopped.',
            })
          }
          label={i18n.translate('xpack.ml.dataframe.analyticsList.editFlyout.maxNumThreadsLabel', {
            defaultMessage: 'Maximum number of threads',
          })}
          isInvalid={maxNumThreads === 0}
          error={
            maxNumThreads === 0 &&
            i18n.translate('xpack.ml.dataframe.analyticsList.editFlyout.maxNumThreadsError', {
              defaultMessage: 'The minimum value is 1.',
            })
          }
        >
          <EuiFieldNumber
            aria-label={i18n.translate(
              'xpack.ml.dataframe.analyticsList.editFlyout.maxNumThreadsAriaLabel',
              {
                defaultMessage: 'Update the maximum number of threads to be used by the analysis.',
              }
            )}
            data-test-subj="mlAnalyticsEditFlyoutMaxNumThreadsLimitInput"
            onChange={(e) => setMaxNumThreads(e.target.value === '' ? undefined : +e.target.value)}
            step={1}
            min={1}
            readOnly={state !== DATA_FRAME_TASK_STATE.STOPPED}
            value={maxNumThreads}
          />
        </EuiFormRow>
      </EuiForm>
    </>
  );

  const tabs = [
    {
      id: 'job-details',
      'data-test-subj': 'mlEditAnalyticsJobFlyout-jobDetails',
      name: i18n.translate('xpack.ml.dataframe.analyticsList.editJobFlyout.jobDetailsTitle', {
        defaultMessage: 'Job details',
      }),
      content: jobDetailsContent,
    },
    {
      id: 'custom-urls',
      'data-test-subj': 'mlEditAnalyticsJobFlyout-customUrls',
      name: i18n.translate('xpack.ml.dataframe.analyticsList.editJobFlyout.customUrlsTitle', {
        defaultMessage: 'Custom URLs',
      }),
      content: (
        <CustomUrlsWrapper
          job={analyticsJob as DataFrameAnalyticsConfig}
          jobCustomUrls={customUrls}
          setCustomUrls={setCustomUrls}
        />
      ),
    },
  ];

  const isValidJobCustomUrls = useMemo(() => isValidCustomUrls(customUrls), [customUrls]);

  return (
    <EuiFlyout
      onClose={closeFlyout}
      hideCloseButton
      aria-labelledby="analyticsEditFlyoutTitle"
      data-test-subj="mlAnalyticsEditFlyout"
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
        <EuiTabbedContent
          tabs={tabs}
          initialSelectedTab={tabs[0]}
          onTabClick={({ id }) => {
            setActiveTabId(id);
          }}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="mlAnalyticsEditFlyoutCancelButton"
              iconType="cross"
              onClick={closeFlyout}
              flush="left"
            >
              {i18n.translate('xpack.ml.dataframe.analyticsList.editFlyoutCancelButtonText', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="mlAnalyticsEditFlyoutUpdateButton"
              onClick={onSubmit}
              fill
              isDisabled={updateButtonDisabled || isValidJobCustomUrls === false}
            >
              {i18n.translate('xpack.ml.dataframe.analyticsList.editFlyoutUpdateButtonText', {
                defaultMessage: 'Update',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
