/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { Draft } from 'immer';

import { useEuiTheme, EuiComboBox, EuiFormRow, EuiSkeletonRectangle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useFormField } from '@kbn/ml-form-utils/use_form_field';
import { FormTextInput } from '@kbn/ml-form-utils/components/form_text_input';
import type { FormSlice, State } from '@kbn/ml-form-utils/form_slice';

import { getErrorMessage } from '../../../common/utils/errors';

import { useAppDependencies, useToastNotifications } from '../app_dependencies';
import { ToastNotificationText } from './toast_notification_text';
import { useGetEsIngestPipelines } from '../hooks';

const destinationIngestPipelineLabel = i18n.translate(
  'xpack.transform.destinationIngestPipelineLabel',
  {
    defaultMessage: 'Destination ingest Pipeline',
  }
);

export const TransformIngestPipelineNamesForm = <
  FF extends string,
  FS extends string,
  VN extends string
>({
  slice,
}: {
  slice: FormSlice<FF | 'destinationIngestPipeline', FS, VN>;
}) => {
  type ActionFormFields = keyof Draft<
    State<FF | 'destinationIngestPipeline', FS, VN>
  >['formFields'];

  const dispatch = useDispatch();
  const { euiTheme } = useEuiTheme();
  const { i18n: i18nStart, theme } = useAppDependencies();
  const toastNotifications = useToastNotifications();

  const { errors, value } = useFormField(slice, 'destinationIngestPipeline');

  const {
    error: esIngestPipelinesError,
    data: esIngestPipelinesData,
    isLoading,
  } = useGetEsIngestPipelines();

  const ingestPipelineNames = esIngestPipelinesData?.map(({ name }) => name) ?? [];

  useEffect(() => {
    if (esIngestPipelinesError !== null) {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.transform.stepDetailsForm.errorGettingIngestPipelines', {
          defaultMessage: 'An error occurred getting the existing ingest pipeline names:',
        }),
        text: toMountPoint(
          <ToastNotificationText text={getErrorMessage(esIngestPipelinesError)} />,
          { theme, i18n: i18nStart }
        ),
      });
    }
    // custom comparison
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [esIngestPipelinesError]);

  if (!isLoading && ingestPipelineNames.length === 0)
    return (
      <FormTextInput
        slice={slice}
        field="destinationIngestPipeline"
        label={destinationIngestPipelineLabel}
      />
    );

  return (
    <EuiFormRow label={destinationIngestPipelineLabel} isInvalid={errors.length > 0} error={errors}>
      <EuiSkeletonRectangle
        width="100%"
        height={euiTheme.size.xxl}
        isLoading={isLoading}
        contentAriaLabel={destinationIngestPipelineLabel}
      >
        <EuiComboBox
          data-test-subj="transformDestinationPipelineSelect"
          aria-label={i18n.translate(
            'xpack.transform.stepDetailsForm.destinationIngestPipelineAriaLabel',
            {
              defaultMessage: 'Select an ingest pipeline (optional)',
            }
          )}
          placeholder={i18n.translate(
            'xpack.transform.stepDetailsForm.destinationIngestPipelineComboBoxPlaceholder',
            {
              defaultMessage: 'Select an ingest pipeline (optional)',
            }
          )}
          singleSelection={{ asPlainText: true }}
          options={ingestPipelineNames.map((label: string) => ({ label }))}
          selectedOptions={value !== '' ? [{ label: value }] : []}
          onChange={(options) =>
            dispatch(
              slice.actions.setFormField({
                field: 'destinationIngestPipeline' as ActionFormFields,
                value: options[0]?.label ?? '',
              })
            )
          }
        />
      </EuiSkeletonRectangle>
    </EuiFormRow>
  );
};
