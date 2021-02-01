/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';
import { ANOMALY_RESULT_TYPE } from '../../common/constants/anomalies';
import { AnomalyResultType } from '../../common/types/anomalies';

export interface ResultTypeSelectorProps {
  value: AnomalyResultType | undefined;
  onChange: (value: AnomalyResultType) => void;
}

export const ResultTypeSelector: FC<ResultTypeSelectorProps> = ({
  value: selectedResultType = [],
  onChange,
}) => {
  const resultTypeOptions = [
    {
      value: ANOMALY_RESULT_TYPE.BUCKET,
      title: <FormattedMessage id="xpack.ml.bucketResultType.title" defaultMessage="Bucket" />,
      description: (
        <FormattedMessage
          id="xpack.ml.bucketResultType.description"
          defaultMessage="How unusual was the job within the bucket of time?"
        />
      ),
    },
    {
      value: ANOMALY_RESULT_TYPE.RECORD,
      title: <FormattedMessage id="xpack.ml.recordResultType.title" defaultMessage="Record" />,
      description: (
        <FormattedMessage
          id="xpack.ml.recordResultType.description"
          defaultMessage="What individual anomalies are present in a range of time?"
        />
      ),
    },
    {
      value: ANOMALY_RESULT_TYPE.INFLUENCER,
      title: (
        <FormattedMessage id="xpack.ml.influencerResultType.title" defaultMessage="Influencer" />
      ),
      description: (
        <FormattedMessage
          id="xpack.ml.influencerResultType.description"
          defaultMessage="What are the most unusual entities in a range of time?"
        />
      ),
    },
  ];

  return (
    <EuiFormRow
      fullWidth
      label={
        <FormattedMessage
          id="xpack.ml.resultTypeSelector.formControlLabel"
          defaultMessage="Result type"
        />
      }
    >
      <EuiFlexGroup gutterSize="s">
        {resultTypeOptions.map(({ value, title, description }) => {
          return (
            <EuiFlexItem key={value}>
              <EuiCard
                title={title}
                titleSize={'xs'}
                paddingSize={'s'}
                description={<EuiText size={'xs'}>{description}</EuiText>}
                selectable={{
                  onClick: () => {
                    if (selectedResultType === value) {
                      // don't allow de-select
                      return;
                    }
                    onChange(value);
                  },
                  isSelected: value === selectedResultType,
                }}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
