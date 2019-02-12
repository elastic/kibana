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
import { getMlJobId } from 'x-pack/plugins/apm/common/ml_job_constants';
import { MLJobApiResponse } from 'x-pack/plugins/apm/public/services/rest/ml';

interface TransactionSelectProps {
  serviceName: string;
  existingJobs: MLJobApiResponse['jobs'];
  transactionTypes: string[];
  selected?: string;
  onChange: (value: string) => void;
}

export function TransactionSelect({
  serviceName,
  existingJobs,
  transactionTypes,
  selected,
  onChange
}: TransactionSelectProps) {
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
        options={transactionTypes.map(transactionType => {
          const hasMlJobs = existingJobs.some(
            job => job.job_id === getMlJobId(serviceName, transactionType)
          );
          return {
            value: transactionType,
            inputDisplay: transactionType,
            dropdownDisplay: (
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem>
                  <EuiText>{transactionType}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {hasMlJobs ? (
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
          };
        })}
      />
    </EuiFormRow>
  );
}
