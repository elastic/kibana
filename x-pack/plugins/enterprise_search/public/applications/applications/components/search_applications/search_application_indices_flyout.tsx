/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { EnterpriseSearchApplicationIndex } from '../../../../../common/types/search_applications';

import { healthColorsMap } from '../../../shared/constants/health_colors';

import { KibanaLogic } from '../../../shared/kibana';

import { SearchApplicationIndicesFlyoutLogic } from './search_application_indices_flyout_logic';

export const SearchApplicationIndicesFlyout: React.FC = () => {
  const {
    searchApplicationData,
    searchApplicationName,
    isSearchApplicationLoading,
    isFlyoutVisible,
  } = useValues(SearchApplicationIndicesFlyoutLogic);
  const { closeFlyout } = useActions(SearchApplicationIndicesFlyoutLogic);
  const { navigateToUrl, share } = useValues(KibanaLogic);
  const searchIndicesLocator = useMemo(
    () => share?.url.locators.get('SEARCH_INDEX_DETAILS_LOCATOR_ID'),
    [share]
  );
  const SearchIndicesLinkProps = useCallback(
    (indexName: string) => {
      const viewIndicesLinkDefaultProps = {
        'data-test-subj': 'search-application-index-link',
        'data-telemetry-id': 'entSearchApplications-list-viewIndex',
      };
      if (searchIndicesLocator) {
        return {
          ...viewIndicesLinkDefaultProps,
          href: searchIndicesLocator.getRedirectUrl({}),
          onClick: async (event: React.MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault();
            const url = await searchIndicesLocator.getUrl({ indexName });
            navigateToUrl(url, {
              shouldNotCreateHref: true,
              shouldNotPrepend: true,
            });
          },
        };
      } else {
        return { ...viewIndicesLinkDefaultProps, disabled: true };
      }
    },
    [navigateToUrl, searchIndicesLocator]
  );
  if (!searchApplicationData) return null;
  const { indices } = searchApplicationData;

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
        <EuiLink {...SearchIndicesLinkProps(indexName)}>{indexName}</EuiLink>
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
          <EuiBasicTable items={indices} columns={columns} loading={isSearchApplicationLoading} />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  } else {
    return <></>;
  }
};
