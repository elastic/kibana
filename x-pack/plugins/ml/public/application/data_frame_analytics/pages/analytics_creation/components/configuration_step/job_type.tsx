/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiCard, EuiIcon, EuiFlexItem, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { ANALYSIS_CONFIG_TYPE } from '../../../../../../../common/constants/data_frame_analytics';
import { DataFrameAnalysisConfigType } from '../../../../../../../common/types/data_frame_analytics';

import { AnalyticsJobType } from '../../../analytics_management/hooks/use_create_analytics_form/state';

interface Props {
  type: AnalyticsJobType;
  setFormState: React.Dispatch<React.SetStateAction<any>>;
}

interface Details {
  helpText: string;
  icon: string;
  title: string;
}

type JobDetails = Record<DataFrameAnalysisConfigType, Details>;

const jobDetails: JobDetails = {
  [ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION]: {
    helpText: i18n.translate('xpack.ml.dataframe.analytics.create.outlierDetectionHelpText', {
      defaultMessage: 'Outlier detection identifies unusual data points in the data set.',
    }),
    icon: 'outlierDetectionJob',
    title: i18n.translate('xpack.ml.dataframe.analytics.create.outlierDetectionTitle', {
      defaultMessage: 'Outlier detection',
    }),
  },
  [ANALYSIS_CONFIG_TYPE.REGRESSION]: {
    helpText: i18n.translate('xpack.ml.dataframe.analytics.create.regressionHelpText', {
      defaultMessage: 'Regression predicts numerical values in the data set.',
    }),
    icon: 'regressionJob',
    title: i18n.translate('xpack.ml.dataframe.analytics.create.regressionTitle', {
      defaultMessage: 'Regression',
    }),
  },
  [ANALYSIS_CONFIG_TYPE.CLASSIFICATION]: {
    helpText: i18n.translate('xpack.ml.dataframe.analytics.create.classificationHelpText', {
      defaultMessage: 'Classification predicts labels of data points in the data set.',
    }),
    icon: 'classificationJob',
    title: i18n.translate('xpack.ml.dataframe.analytics.create.classificationTitle', {
      defaultMessage: 'Classification',
    }),
  },
};

export const JobType: FC<Props> = ({ type, setFormState }) => {
  const [selectedCard, setSelectedCard] = useState<any>({});

  return (
    <>
      <EuiFlexGroup gutterSize="m" data-test-subj="mlAnalyticsCreateJobWizardJobTypeSelect">
        {(Object.keys(jobDetails) as Array<keyof typeof jobDetails>).map((jobType) => (
          <EuiFlexItem key={jobType} grow={1}>
            <EuiCard
              icon={<EuiIcon size="xl" type={jobDetails[jobType].icon} />}
              title={jobDetails[jobType].title}
              description={jobDetails[jobType].helpText}
              data-test-subj={`mlAnalyticsCreation-${jobType}-option${
                type === jobType ? ' selectedJobType' : ''
              }`}
              selectable={{
                onClick: () => {
                  // Only allow one job selected at a time and don't allow deselection
                  if (selectedCard[jobType] === true) {
                    return;
                  }

                  setFormState({
                    previousJobType: type,
                    jobType,
                    includes: [],
                    requiredFieldsError: undefined,
                  });
                  setSelectedCard({ [jobType]: !selectedCard[jobType] });
                },
                isSelected: selectedCard[jobType] === true || type === jobType,
              }}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );
};
