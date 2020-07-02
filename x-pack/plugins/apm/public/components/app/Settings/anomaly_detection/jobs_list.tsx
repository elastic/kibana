/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ITableColumn, ManagedTable } from '../../../shared/ManagedTable';
import { LoadingStatePrompt } from '../../../shared/LoadingStatePrompt';
import { AnomalyDetectionJobByEnv } from '../../../../../typings/anomaly_detection';
import { MLJobLink } from '../../../shared/Links/MachineLearningLinks/MLJobLink';

const columns: Array<ITableColumn<AnomalyDetectionJobByEnv>> = [
  {
    field: 'service.environment',
    name: i18n.translate(
      'xpack.apm.settings.anomalyDetection.environmentColumnLabel',
      { defaultMessage: 'Environment' }
    ),
    render: (environment: string) => environment,
  },
  {
    field: 'job_id',
    align: 'right',
    name: 'Action',
    render: (jobId: string) => (
      <MLJobLink jobId={jobId}>View job in ML</MLJobLink>
    ),
  },
];

interface Props {
  isLoading: boolean;
  onAddEnvironments: () => void;
  anomalyDetectionJobsByEnv: AnomalyDetectionJobByEnv[];
}
export const JobsList = ({
  isLoading,
  onAddEnvironments,
  anomalyDetectionJobsByEnv,
}: Props) => {
  return (
    <EuiPanel>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle>
            <h2>
              {i18n.translate(
                'xpack.apm.settings.anomalyDetection.environments',
                {
                  defaultMessage: 'Environments',
                }
              )}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={onAddEnvironments}>
            Add environments
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      You can manage the anomaly detection jobs in Machine Learning.
      <EuiSpacer size="l" />
      <ManagedTable
        noItemsMessage={<LoadingStatePrompt />}
        columns={columns}
        items={isLoading ? [] : anomalyDetectionJobsByEnv}
        pagination={false}
      />
      <EuiSpacer size="l" />
    </EuiPanel>
  );
};
