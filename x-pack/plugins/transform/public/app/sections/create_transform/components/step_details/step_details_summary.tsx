/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiFieldText, EuiFormRow, EuiSelect } from '@elastic/eui';

import { StepDetailsExposedState } from './step_details_form';

export const StepDetailsSummary: FC<StepDetailsExposedState> = React.memo(
  ({
    continuousModeDateField,
    createIndexPattern,
    isContinuousModeEnabled,
    transformId,
    transformDescription,
    destinationIndex,
    touched,
    indexPatternDateField,
  }) => {
    if (touched === false) {
      return null;
    }

    const destinationIndexHelpText = createIndexPattern
      ? i18n.translate('xpack.transform.stepDetailsSummary.createIndexPatternMessage', {
          defaultMessage: 'A Kibana index pattern will be created for this transform.',
        })
      : '';

    return (
      <div data-test-subj="transformStepDetailsSummary">
        <EuiFormRow
          label={i18n.translate('xpack.transform.stepDetailsSummary.transformIdLabel', {
            defaultMessage: 'Transform ID',
          })}
        >
          <EuiFieldText defaultValue={transformId} disabled={true} />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.transform.stepDetailsSummary.transformDescriptionLabel', {
            defaultMessage: 'Transform description',
          })}
        >
          <EuiFieldText defaultValue={transformDescription} disabled={true} />
        </EuiFormRow>
        <EuiFormRow
          helpText={destinationIndexHelpText}
          label={i18n.translate('xpack.transform.stepDetailsSummary.destinationIndexLabel', {
            defaultMessage: 'Destination index',
          })}
        >
          <EuiFieldText defaultValue={destinationIndex} disabled={true} />
        </EuiFormRow>
        <EuiFormRow
          helpText={i18n.translate(
            'xpack.transform.stepDetailsSummary.indexPatternTimeFilterLabel',
            {
              defaultMessage: 'Time filter',
            }
          )}
        >
          <EuiSelect
            options={[{ text: indexPatternDateField }]}
            value={indexPatternDateField}
            disabled={true}
          />
        </EuiFormRow>

        {isContinuousModeEnabled && (
          <EuiFormRow
            label={i18n.translate(
              'xpack.transform.stepDetailsSummary.continuousModeDateFieldLabel',
              {
                defaultMessage: 'Continuous mode date field',
              }
            )}
          >
            <EuiFieldText defaultValue={continuousModeDateField} disabled={true} />
          </EuiFormRow>
        )}
      </div>
    );
  }
);
