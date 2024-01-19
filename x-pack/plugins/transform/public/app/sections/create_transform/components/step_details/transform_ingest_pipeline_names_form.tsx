/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, type FC } from 'react';

import { EuiComboBox, EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { getErrorMessage } from '../../../../../../common/utils/errors';

import { useAppDependencies, useToastNotifications } from '../../../../app_dependencies';
import { ToastNotificationText } from '../../../../components';
import { useGetEsIngestPipelines } from '../../../../hooks';

import { useWizardActions, useWizardSelector } from '../../state_management/create_transform_store';

export const TransformIngestPipelineNamesForm: FC = () => {
  const { i18n: i18nStart, theme } = useAppDependencies();
  const toastNotifications = useToastNotifications();

  const destinationIngestPipeline = useWizardSelector(
    (s) => s.stepDetails.destinationIngestPipeline
  );

  const { setDestinationIngestPipeline } = useWizardActions();

  const { error: esIngestPipelinesError, data: esIngestPipelinesData } = useGetEsIngestPipelines();

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

  if (ingestPipelineNames.length === 0) return null;

  return (
    <EuiFormRow
      label={i18n.translate('xpack.transform.stepDetailsForm.destinationIngestPipelineLabel', {
        defaultMessage: 'Destination ingest pipeline',
      })}
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
        selectedOptions={
          destinationIngestPipeline !== '' ? [{ label: destinationIngestPipeline }] : []
        }
        onChange={(options) => setDestinationIngestPipeline(options[0]?.label ?? '')}
      />
    </EuiFormRow>
  );
};
