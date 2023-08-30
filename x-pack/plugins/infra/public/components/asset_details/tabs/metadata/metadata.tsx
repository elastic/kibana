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
import { Table } from './table';
import { getAllFields } from './utils';
import { useMetadataStateProviderContext } from '../../hooks/use_metadata_state';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useAssetDetailsUrlState } from '../../hooks/use_asset_details_url_state';

export interface MetadataSearchUrlState {
  metadataSearchUrlState: string;
  setMetadataSearchUrlState: (metadataSearch: { metadataSearch?: string }) => void;
}

export const Metadata = () => {
  const [urlState, setUrlState] = useAssetDetailsUrlState();
  const { overrides } = useAssetDetailsRenderPropsContext();
  const {
    metadata,
    loading: metadataLoading,
    error: fetchMetadataError,
  } = useMetadataStateProviderContext();
  const { showActionsColumn = false } = overrides?.metadata ?? {};

  const fields = useMemo(() => getAllFields(metadata), [metadata]);

  const onSearchChange = useCallback(
    (newQuery: string) => {
      setUrlState({ metadataSearch: newQuery });
    },
    [setUrlState]
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
      search={urlState?.metadataSearch}
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
