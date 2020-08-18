/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { ANALYSIS_CONFIG_TYPE } from '../../../../common';

import { AnalyticsJobType } from '../../../analytics_management/hooks/use_create_analytics_form/state';

interface Props {
  type: AnalyticsJobType;
  setFormState: React.Dispatch<React.SetStateAction<any>>;
}

export const JobType: FC<Props> = ({ type, setFormState }) => {
  const outlierHelpText = i18n.translate(
    'xpack.ml.dataframe.analytics.create.outlierDetectionHelpText',
    {
      defaultMessage: 'Outlier detection identifies unusual data points in the data set.',
    }
  );

  const regressionHelpText = i18n.translate(
    'xpack.ml.dataframe.analytics.create.outlierRegressionHelpText',
    {
      defaultMessage: 'Regression predicts numerical values in the data set.',
    }
  );

  const classificationHelpText = i18n.translate(
    'xpack.ml.dataframe.analytics.create.classificationHelpText',
    {
      defaultMessage: 'Classification predicts labels of data points in the data set.',
    }
  );

  const helpText = {
    [ANALYSIS_CONFIG_TYPE.REGRESSION]: regressionHelpText,
    [ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION]: outlierHelpText,
    [ANALYSIS_CONFIG_TYPE.CLASSIFICATION]: classificationHelpText,
  };

  return (
    <Fragment>
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.ml.dataframe.analytics.create.jobTypeLabel', {
          defaultMessage: 'Job type',
        })}
        helpText={type !== undefined ? helpText[type] : ''}
      >
        <EuiSelect
          fullWidth
          options={Object.values(ANALYSIS_CONFIG_TYPE).map((jobType) => ({
            value: jobType,
            text: jobType.replace(/_/g, ' '),
            'data-test-subj': `mlAnalyticsCreation-${jobType}-option`,
          }))}
          value={type}
          hasNoInitialSelection={true}
          onChange={(e) => {
            const value = e.target.value as AnalyticsJobType;
            setFormState({
              previousJobType: type,
              jobType: value,
              includes: [],
              requiredFieldsError: undefined,
            });
          }}
          data-test-subj="mlAnalyticsCreateJobWizardJobTypeSelect"
        />
      </EuiFormRow>
    </Fragment>
  );
};
