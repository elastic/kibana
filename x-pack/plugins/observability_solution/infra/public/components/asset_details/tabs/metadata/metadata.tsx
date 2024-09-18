/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import { Table } from './table';
import { getAllFields } from './utils';
import { useMetadataStateContext } from '../../hooks/use_metadata_state';
import { MetadataExplanationMessage } from '../../components/metadata_explanation';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useAssetDetailsUrlState } from '../../hooks/use_asset_details_url_state';
import { MetadataErrorCallout } from '../../components/metadata_error_callout';

export interface MetadataSearchUrlState {
  metadataSearchUrlState: string;
  setMetadataSearchUrlState: (metadataSearch: { metadataSearch?: string }) => void;
}

export const Metadata = () => {
  const [urlState, setUrlState] = useAssetDetailsUrlState();
  const { overrides, asset } = useAssetDetailsRenderPropsContext();
  const {
    metadata,
    loading: metadataLoading,
    error: fetchMetadataError,
  } = useMetadataStateContext();
  const { showActionsColumn = false } = overrides?.metadata ?? {};

  const fields = useMemo(() => getAllFields(metadata), [metadata]);

  const onSearchChange = useCallback(
    (newQuery: string) => {
      setUrlState({ metadataSearch: newQuery });
    },
    [setUrlState]
  );

  if (fetchMetadataError && !metadataLoading) {
    return <MetadataErrorCallout />;
  }

  return (
    <>
      <MetadataExplanationMessage assetType={asset.type} />
      <EuiHorizontalRule margin="m" />
      <Table
        search={urlState?.metadataSearch}
        onSearchChange={onSearchChange}
        showActionsColumn={showActionsColumn}
        rows={fields}
        loading={metadataLoading}
      />
    </>
  );
};

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default Metadata;
