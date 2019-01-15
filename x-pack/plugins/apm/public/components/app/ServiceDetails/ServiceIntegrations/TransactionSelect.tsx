/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  // @ts-ignore
  EuiSuperSelect,
  EuiText,
  EuiToolTip
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { MLJobApiResponse } from 'x-pack/plugins/apm/public/services/rest/ml';

interface TransactionSelectProps {
  existingJobs: MLJobApiResponse['jobs'];
  types: string[];
  selected?: string;
  onChange: (value: string) => void;
}

export const TransactionSelect: React.SFC<TransactionSelectProps> = ({
  existingJobs,
  types,
  selected,
  onChange
}) => {
  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.selectTransactionTypeLabel',
        {
          defaultMessage: 'Select a transaction type for this job'
        }
      )}
    >
      <EuiSuperSelect
        valueOfSelected={selected}
        onChange={onChange}
        options={types.map((type, i) => ({
          value: type,
          inputDisplay: type,
          dropdownDisplay: (
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiText>{type}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {Boolean(
                  existingJobs.find(
                    job => job.jobId && job.jobId.includes(type)
                  )
                ) ? (
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.existedJobTooltip',
                      {
                        defaultMessage: 'ML job exists for this type'
                      }
                    )}
                  >
                    <EuiIcon type="machineLearningApp" />
                  </EuiToolTip>
                ) : (
                  <EuiIcon type="empty" />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          )
        }))}
      />
    </EuiFormRow>
  );
};
