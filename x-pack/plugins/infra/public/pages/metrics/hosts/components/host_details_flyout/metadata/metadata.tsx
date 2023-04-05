/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLoadingChart } from '@elastic/eui';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSourceContext } from '../../../../../../containers/metrics_source';
import { findInventoryModel } from '../../../../../../../common/inventory_models';
import type { InventoryItemType } from '../../../../../../../common/inventory_models/types';
import { useMetadata } from '../../../../metric_detail/hooks/use_metadata';
import { Table } from './table';
import { getAllFields } from './utils';
import type { HostNodeRow } from '../../../hooks/use_hosts_table';
import type { MetricsTimeInput } from '../../../../metric_detail/hooks/use_metrics_time';

export interface TabProps {
  currentTimeRange: MetricsTimeInput;
  node: HostNodeRow;
  nodeType: InventoryItemType;
}

export const Metadata = ({ node, currentTimeRange, nodeType }: TabProps) => {
  const nodeId = node.name;
  const inventoryModel = findInventoryModel(nodeType);
  const { sourceId } = useSourceContext();
  const {
    loading: metadataLoading,
    error,
    metadata,
  } = useMetadata(nodeId, nodeType, inventoryModel.requiredMetrics, sourceId, currentTimeRange);

  const fields = useMemo(() => getAllFields(metadata), [metadata]);

  if (metadataLoading) {
    return <LoadingPlaceholder />;
  }

  if (error) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.infra.hostsViewPage.hostDetail.metadata.errorTitle', {
          defaultMessage: 'Sorry, there was an error',
        })}
        color="danger"
        iconType="error"
        data-test-subj="infraMetadataErrorCallout"
      >
        <FormattedMessage
          id="xpack.infra.hostsViewPage.hostDetail.metadata.errorMessage"
          defaultMessage="There was an error loading your data. Try to {reload} and open the host details again."
          values={{
            reload: (
              <EuiLink
                data-test-subj="infraMetadataReloadPageLink"
                onClick={() => window.location.reload()}
              >
                {i18n.translate('xpack.infra.hostsViewPage.hostDetail.metadata.errorAction', {
                  defaultMessage: 'reload the page',
                })}
              </EuiLink>
            ),
          }}
        />
      </EuiCallOut>
    );
  }

  return fields.length > 0 ? (
    <Table rows={fields} />
  ) : (
    <EuiCallOut
      data-test-subj="infraMetadataNoData"
      title={i18n.translate('xpack.infra.hostsViewPage.hostDetail.metadata.noMetadataFound', {
        defaultMessage: 'Sorry, there is no metadata related to this host.',
      })}
      size="m"
      iconType="iInCircle"
    />
  );
};

const LoadingPlaceholder = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '200px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <EuiLoadingChart data-test-subj="infraHostMetadataLoading" size="xl" />
    </div>
  );
};
