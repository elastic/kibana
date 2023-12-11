/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { useEuiTheme, EuiComboBox, EuiFormRow, EuiSkeletonRectangle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useGetEsIngestPipelines } from '../../../../hooks';

import { EditTransformFlyoutFormTextInput } from './edit_transform_flyout_form_text_input';
import { useEditTransformFlyout } from './use_edit_transform_flyout';

const ingestPipelineLabel = i18n.translate(
  'xpack.transform.transformList.editFlyoutFormDestinationIngestPipelineLabel',
  {
    defaultMessage: 'Ingest Pipeline',
  }
);

export const EditTransformIngestPipeline: FC = () => {
  const { euiTheme } = useEuiTheme();
  const { errorMessages, value } = useEditTransformFlyout('destinationIngestPipeline');
  const { formField } = useEditTransformFlyout('actions');

  const { data: esIngestPipelinesData, isLoading } = useGetEsIngestPipelines();
  const ingestPipelineNames = esIngestPipelinesData?.map(({ name }) => name) ?? [];

  return (
    <>
      {
        // If the list of ingest pipelines is not available
        // gracefully defaults to text input
        ingestPipelineNames.length > 0 || isLoading ? (
          <EuiFormRow
            label={ingestPipelineLabel}
            isInvalid={errorMessages.length > 0}
            error={errorMessages}
          >
            <EuiSkeletonRectangle
              width="100%"
              height={euiTheme.size.xxl}
              isLoading={isLoading}
              contentAriaLabel={ingestPipelineLabel}
            >
              <EuiComboBox
                data-test-subj="transformEditFlyoutDestinationIngestPipelineFieldSelect"
                aria-label={i18n.translate(
                  'xpack.transform.stepDetailsForm.editFlyoutFormDestinationIngestPipelineFieldSelectAriaLabel',
                  {
                    defaultMessage: 'Select an ingest pipeline',
                  }
                )}
                placeholder={i18n.translate(
                  'xpack.transform.stepDetailsForm.editFlyoutFormDestinationIngestPipelineFieldSelectPlaceholder',
                  {
                    defaultMessage: 'Select an ingest pipeline',
                  }
                )}
                singleSelection={{ asPlainText: true }}
                options={ingestPipelineNames.map((label: string) => ({ label }))}
                selectedOptions={[{ label: value }]}
                onChange={(o) =>
                  formField({ field: 'destinationIngestPipeline', value: o[0]?.label ?? '' })
                }
              />
            </EuiSkeletonRectangle>
          </EuiFormRow>
        ) : (
          <EditTransformFlyoutFormTextInput
            field="destinationIngestPipeline"
            label={ingestPipelineLabel}
          />
        )
      }
    </>
  );
};
