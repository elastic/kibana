/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC, useMemo } from 'react';
import { ANOMALY_RESULT_TYPE } from '../../common/constants/anomalies';
import { AnomalyResultType } from '../../common/types/anomalies';

export interface ResultTypeSelectorProps {
  value: AnomalyResultType | undefined;
  availableOption: AnomalyResultType[];
  onChange: (value: AnomalyResultType) => void;
}

export const ResultTypeSelector: FC<ResultTypeSelectorProps> = React.memo(
  ({ value: selectedResultType = [], onChange, availableOption }) => {
    const resultTypeOptions = useMemo(() => {
      return [
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
              defaultMessage="What individual anomalies are present in a time range?"
            />
          ),
        },
        {
          value: ANOMALY_RESULT_TYPE.INFLUENCER,
          title: (
            <FormattedMessage
              id="xpack.ml.influencerResultType.title"
              defaultMessage="Influencer"
            />
          ),
          description: (
            <FormattedMessage
              id="xpack.ml.influencerResultType.description"
              defaultMessage="What are the most unusual entities in a time range?"
            />
          ),
        },
      ].filter((v) => availableOption.includes(v.value));
    }, [availableOption]);

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
                  description={<small>{description}</small>}
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
                  data-test-subj={`mlAnomalyAlertResult_${value}${
                    value === selectedResultType ? '_selected' : ''
                  }`}
                />
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      </EuiFormRow>
    );
  }
);
