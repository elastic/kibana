/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSplitPanel,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { generateEncodedPath } from '../../../../../shared/encode_path_params';
import { Loading } from '../../../../../shared/loading';
import { EuiButtonTo } from '../../../../../shared/react_router_helpers';
import { SEARCH_INDEX_TAB_PATH } from '../../../../routes';
import { IndexNameLogic } from '../../index_name_logic';
import { SearchIndexTabId } from '../../search_index';
import { CrawlCustomSettingsFlyout } from '../crawl_custom_settings_flyout/crawl_custom_settings_flyout';
import { DeleteDomainModal } from '../domain_management/delete_domain_modal';
import { DeleteDomainModalLogic } from '../domain_management/delete_domain_modal_logic';

import { CrawlerDomainDetailLogic } from './crawler_domain_detail_logic';
import { CrawlerDomainDetailTabs } from './crawler_domain_detail_tabs';

export const CrawlerDomainDetail: React.FC<{ domainId: string }> = ({ domainId }) => {
  const { indexName } = useValues(IndexNameLogic);
  const crawlerDomainDetailLogic = CrawlerDomainDetailLogic({ domainId });
  const { domain, getLoading } = useValues(crawlerDomainDetailLogic);
  const { fetchDomainData } = useActions(crawlerDomainDetailLogic);
  const { showModal } = useActions(DeleteDomainModalLogic);

  useEffect(() => {
    fetchDomainData(domainId);
  }, [domainId]);

  const domainUrl = domain?.url ?? '...';

  return getLoading ? (
    <Loading />
  ) : (
    <>
      <EuiSpacer />
      <EuiButtonTo
        data-telemetry-id="entSearchContent-crawler-domainDetail-header-allDomains"
        color="text"
        iconType="arrowLeft"
        size="s"
        to={generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
          indexName,
          tabId: SearchIndexTabId.DOMAIN_MANAGEMENT,
        })}
      >
        {i18n.translate('xpack.enterpriseSearch.crawler.domainDetail.allDomainsButtonLabel', {
          defaultMessage: 'All domains',
        })}
      </EuiButtonTo>
      <EuiSpacer />
      <EuiSplitPanel.Outer hasBorder>
        <EuiSplitPanel.Inner color="subdued">
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h4>
                  {i18n.translate('xpack.enterpriseSearch.content.crawler.domainDetail.title', {
                    defaultMessage: 'Manage {domain}',
                    values: { domain: domainUrl },
                  })}
                </h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-telemetry-id="entSearchContent-crawler-domainDetail-header-deleteDomain"
                isLoading={getLoading}
                color="danger"
                onClick={() => {
                  if (domain) {
                    showModal(domain);
                  }
                }}
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.crawler.domainDetail.deleteDomainButtonLabel',
                  {
                    defaultMessage: 'Delete domain',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          {domain && <CrawlerDomainDetailTabs domain={domain} indexName={indexName} />}
          <DeleteDomainModal />
          <CrawlCustomSettingsFlyout />
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </>
  );
};
