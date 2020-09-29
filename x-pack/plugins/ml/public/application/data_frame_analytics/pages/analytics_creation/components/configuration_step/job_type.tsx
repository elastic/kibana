/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiCard, EuiIcon, EuiFlexItem, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { ANALYSIS_CONFIG_TYPE } from '../../../../../../../common/constants/data_frame_analytics';

import { AnalyticsJobType } from '../../../analytics_management/hooks/use_create_analytics_form/state';

interface Props {
  type: AnalyticsJobType;
  setFormState: React.Dispatch<React.SetStateAction<any>>;
}

interface JobDetails {
  [key: string]: {
    helpText: string;
    icon: string;
    title: string;
  };
}

const jobDetails: JobDetails = {
  [ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION]: {
    helpText: i18n.translate('xpack.ml.dataframe.analytics.create.outlierDetectionHelpText', {
      defaultMessage: 'Outlier detection identifies unusual data points in the data set.',
    }),
    icon: 'outlierDetectionJob',
    title: 'Outlier detection',
  },
  [ANALYSIS_CONFIG_TYPE.REGRESSION]: {
    helpText: i18n.translate('xpack.ml.dataframe.analytics.create.outlierRegressionHelpText', {
      defaultMessage: 'Regression predicts numerical values in the data set.',
    }),
    icon: 'regressionJob',
    title: 'Regression',
  },
  [ANALYSIS_CONFIG_TYPE.CLASSIFICATION]: {
    helpText: i18n.translate('xpack.ml.dataframe.analytics.create.classificationHelpText', {
      defaultMessage: 'Classification predicts labels of data points in the data set.',
    }),
    icon: 'classificationJob',
    title: 'Classification',
  },
};

export const JobType: FC<Props> = ({ type, setFormState }) => {
  const [selectedCard, setSelectedCard] = useState<any>({});

  return (
    <>
      <EuiFlexGroup gutterSize="m" data-test-subj="mlAnalyticsCreateJobWizardJobTypeSelect">
        {Object.keys(jobDetails).map((jobType) => (
          <EuiFlexItem key={jobType} grow={false}>
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
