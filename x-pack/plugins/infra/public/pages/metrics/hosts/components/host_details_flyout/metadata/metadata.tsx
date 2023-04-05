/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiLoadingChart, EuiLink, EuiSearchBar, EuiSpacer, Query } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { debounce } from 'lodash';
import { useSourceContext } from '../../../../../../containers/metrics_source';
import { findInventoryModel } from '../../../../../../../common/inventory_models';
import type { InventoryItemType } from '../../../../../../../common/inventory_models/types';
import { useMetadata } from '../../../../metric_detail/hooks/use_metadata';
import { Table } from './table';
import { getAllFields } from './utils';
import type { HostNodeRow } from '../../../hooks/use_hosts_table';
import type { MetricsTimeInput } from '../../../../metric_detail/hooks/use_metrics_time';
import { useHostFlyoutOpen } from '../../../hooks/use_host_flyout_open_url_state';

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

  const [hostFlyoutOpen, setHostFlyoutOpen] = useHostFlyoutOpen();
  const [searchBarState, setSearchBarState] = useState<Query>(() =>
    hostFlyoutOpen.metadataSearch ? Query.parse(hostFlyoutOpen.metadataSearch) : Query.MATCH_ALL
  );

  const debouncedSearchOnChange = useMemo(
    () =>
      debounce<(queryText: string) => void>(
        (queryText) => setHostFlyoutOpen({ metadataSearch: String(queryText) ?? '' }),
        500
      ),
    [setHostFlyoutOpen]
  );

  const searchBarOnChange = useCallback(
    ({ query, queryText }) => {
      setSearchBarState(query);
      debouncedSearchOnChange(queryText);
    },
    [setSearchBarState, debouncedSearchOnChange]
  );

  const getQueriedMetadata = () => {
    try {
      const metadataResult = EuiSearchBar.Query.execute(searchBarState, fields, {
        defaultFields: ['name', 'value'],
      });
      return metadataResult;
    } catch (errorM) {
      // The error is shown in the search bar already
      return [];
    }
  };

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

  return (
    <>
      <EuiSearchBar
        query={searchBarState}
        onChange={searchBarOnChange}
        box={{
          incremental: true,
          placeholder: i18n.translate('xpack.infra.metrics.nodeDetails.searchForProcesses', {
            defaultMessage: 'Search for metadata…',
          }),
          'data-test-subj': 'infraMetadataSearchBarInput',
        }}
      />
      <EuiSpacer size="m" />
      {metadataLoading ? (
        <LoadingPlaceholder />
      ) : fields.length > 0 ? (
        getQueriedMetadata()?.length > 0 ? (
          <Table rows={getQueriedMetadata()} />
        ) : (
          <EuiCallOut
            data-test-subj="infraMetadataNoDataFound"
            title={i18n.translate('xpack.infra.hostsViewPage.hostDetail.metadata.noMetadataFound', {
              defaultMessage: 'There is no data to display.',
            })}
            size="m"
            iconType="iInCircle"
          />
        )
      ) : (
        <EuiCallOut
          data-test-subj="infraMetadataNoData"
          title={i18n.translate('xpack.infra.hostsViewPage.hostDetail.metadata.noMetadataFound', {
            defaultMessage: 'Sorry, there is no metadata related to this host.',
          })}
          size="m"
          iconType="iInCircle"
        />
      )}
    </>
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
