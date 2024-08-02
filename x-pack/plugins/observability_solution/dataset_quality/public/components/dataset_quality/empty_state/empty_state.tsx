/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { DEFAULT_LOGS_DATA_VIEW } from '../../../../common/constants';
import { useEmptyState } from '../../../hooks/use_empty_state';

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function EmptyStateWrapper({ children }: { children: React.ReactNode }) {
  const { canReadDataset, isDatasetEmpty } = useEmptyState();

  if (!canReadDataset) {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        color="warning"
        title={
          <h2>
            {i18n.translate('xpack.datasetQuality.emptyState.noPrivileges.title', {
              defaultMessage: `Datasets couldn't be loaded`,
            })}
          </h2>
        }
        body={
          <p data-test-subj="datasetQualityNoPrivilegesEmptyState">
            <FormattedMessage
              id="xpack.datasetQuality.emptyState.noPrivileges.message"
              defaultMessage="You don't have the required privileges to view logs data. Make sure you have sufficient privileges to view {datasetPattern}."
              values={{
                datasetPattern: <EuiCode>{DEFAULT_LOGS_DATA_VIEW}</EuiCode>,
              }}
            />
            {/* TODO: Learn more link to docs */}
          </p>
        }
      />
    );
  }

  if (isDatasetEmpty) {
    return (
      <EuiEmptyPrompt
        iconType="logoLogging"
        color="primary"
        title={
          <h2>
            {i18n.translate('xpack.datasetQuality.emptyState.noData.title', {
              defaultMessage: 'No datasets found',
            })}
          </h2>
        }
        body={
          <p data-test-subj="datasetQualityNoDataEmptyState">
            <FormattedMessage
              id="xpack.datasetQuality.emptyState.noData.message"
              defaultMessage="No logs datasets found. To get started, make sure you have logs data streams available matching {datasetPattern}."
              values={{
                datasetPattern: <EuiCode>{DEFAULT_LOGS_DATA_VIEW}</EuiCode>,
              }}
            />
          </p>
        }
      />
    );
  }

  return <>{children}</>;
}
