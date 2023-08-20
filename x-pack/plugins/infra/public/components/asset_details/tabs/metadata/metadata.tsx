/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { TimeRange } from '@kbn/es-query';
import type { InventoryItemType } from '../../../../../common/inventory_models/types';
import { Table } from './table';
import { getAllFields } from './utils';
import { useAssetDetailsStateContext } from '../../hooks/use_asset_details_state';

export interface MetadataSearchUrlState {
  metadataSearchUrlState: string;
  setMetadataSearchUrlState: (metadataSearch: { metadataSearch?: string }) => void;
}

export interface MetadataProps {
  assetName: string;
  assetType: InventoryItemType;
  dateRange: TimeRange;
  showActionsColumn?: boolean;
  search?: string;
  onSearchChange?: (query: string) => void;
}

export const Metadata = () => {
  const { overrides, onTabsStateChange, metadataResponse } = useAssetDetailsStateContext();
  const { query, showActionsColumn = false } = overrides?.metadata ?? {};
  const { metadataLoading, fetchMetadataError, metadata } = metadataResponse;

  const fields = useMemo(() => getAllFields(metadata), [metadata]);

  const onSearchChange = useCallback(
    (newQuery: string) => {
      if (onTabsStateChange) {
        onTabsStateChange({ metadata: { query: newQuery } });
      }
    },
    [onTabsStateChange]
  );

  if (fetchMetadataError) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.infra.metadataEmbeddable.errorTitle', {
          defaultMessage: 'Sorry, there was an error',
        })}
        color="danger"
        iconType="error"
        data-test-subj="infraAssetDetailsMetadataErrorCallout"
      >
        <FormattedMessage
          id="xpack.infra.metadataEmbeddable.errorMessage"
          defaultMessage="There was an error loading your data. Try to {reload} and open the host details again."
          values={{
            reload: (
              <EuiLink
                data-test-subj="infraMetadataReloadPageLink"
                onClick={() => window.location.reload()}
              >
                {i18n.translate('xpack.infra.metadataEmbeddable.errorAction', {
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
    <Table
      search={query}
      onSearchChange={onSearchChange}
      showActionsColumn={showActionsColumn}
      rows={fields}
      loading={metadataLoading}
    />
  );
};

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default Metadata;
