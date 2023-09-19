/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../../../../../common/constants';
import { Status } from '../../../../../common/types/api';

import { EnterpriseSearchApplicationIndex } from '../../../../../common/types/search_applications';

import { SEARCH_INDEX_PATH } from '../../../enterprise_search_content/routes';
import { healthColorsMap } from '../../../shared/constants/health_colors';
import { generateEncodedPath } from '../../../shared/encode_path_params';
import { EuiLinkTo } from '../../../shared/react_router_helpers';

import { SearchApplicationError } from '../search_application/search_application_error';

import { SearchApplicationIndicesFlyoutLogic } from './search_application_indices_flyout_logic';

export const SearchApplicationIndicesFlyout: React.FC = () => {
  const {
    searchApplicationData,
    searchApplicationName,
    isSearchApplicationLoading,
    isFlyoutVisible,
    fetchSearchApplicationApiStatus,
    fetchSearchApplicationApiError,
  } = useValues(SearchApplicationIndicesFlyoutLogic);
  const { closeFlyout } = useActions(SearchApplicationIndicesFlyoutLogic);

  if (!searchApplicationData) return null;
  const { indices } = searchApplicationData;
  const searchApplicationFetchError =
    fetchSearchApplicationApiStatus === Status.ERROR ? true : false;

  const columns: Array<EuiBasicTableColumn<EnterpriseSearchApplicationIndex>> = [
    {
      field: 'name',
      name: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.list.indicesFlyout.table.name.columnTitle',
        {
          defaultMessage: 'Index name',
        }
      ),
      render: (indexName: string) => (
        <EuiLinkTo
          data-test-subj="search-application-index-link"
          data-telemetry-id="entSearchApplications-list-viewIndex"
          to={`${ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL}${generateEncodedPath(SEARCH_INDEX_PATH, {
            indexName,
          })}`}
          shouldNotCreateHref
        >
          {indexName}
        </EuiLinkTo>
      ),
      sortable: true,
      truncateText: true,
      width: '40%',
    },
    {
      field: 'health',
      name: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.list.indicesFlyout.table.health.columnTitle',
        {
          defaultMessage: 'Index health',
        }
      ),
      render: (health: 'red' | 'green' | 'yellow' | 'unavailable') => (
        <span>
          <EuiIcon type="dot" color={healthColorsMap[health] ?? ''} />
          &nbsp;{health ?? '-'}
        </span>
      ),
      sortable: true,
      truncateText: true,
      width: '15%',
    },
    {
      field: 'count',
      name: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.list.indicesFlyout.table.docsCount.columnTitle',
        {
          defaultMessage: 'Docs count',
        }
      ),
      sortable: true,
      truncateText: true,
      width: '15%',
    },
  ];

  if (isFlyoutVisible) {
    return (
      <EuiFlyout ownFocus aria-labelledby="searchApplicationIndicesFlyout" onClose={closeFlyout}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="searchApplicationIndicesFlyout">
              {i18n.translate(
                'xpack.enterpriseSearch.searchApplications.list.indicesFlyout.title',
                {
                  defaultMessage: 'View Indices',
                }
              )}
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.enterpriseSearch.searchApplications.list.indicesFlyout.subTitle"
              defaultMessage="View the indices associated with {searchApplicationName}"
              values={{
                searchApplicationName,
              }}
            />
          </EuiText>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          {searchApplicationFetchError ? (
            <SearchApplicationError error={fetchSearchApplicationApiError} />
          ) : (
            <EuiBasicTable items={indices} columns={columns} loading={isSearchApplicationLoading} />
          )}
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  } else {
    return <></>;
  }
};
