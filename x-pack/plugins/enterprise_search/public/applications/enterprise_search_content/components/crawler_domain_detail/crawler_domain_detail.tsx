/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiPanel, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import { EuiButtonTo } from '../../../shared/react_router_helpers';
import { SEARCH_INDEX_TAB_PATH } from '../../routes';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';
import { CrawlCustomSettingsFlyout } from '../search_index/crawler/crawl_custom_settings_flyout/crawl_custom_settings_flyout';
import { CrawlerStatusBanner } from '../search_index/crawler/domain_management/crawler_status_banner';
import { DeleteDomainModal } from '../search_index/crawler/domain_management/delete_domain_modal';
import { DeleteDomainModalLogic } from '../search_index/crawler/domain_management/delete_domain_modal_logic';
import { IndexNameLogic } from '../search_index/index_name_logic';
import { SearchIndexTabId } from '../search_index/search_index';
import { baseBreadcrumbs } from '../search_indices';
import { CrawlerStatusIndicator } from '../shared/crawler_status_indicator/crawler_status_indicator';

import { AuthenticationPanel } from './authentication_panel/authentication_panel';
import { CrawlRulesTable } from './crawl_rules_table';
import { CrawlerDomainDetailLogic } from './crawler_domain_detail_logic';
import { DeduplicationPanel } from './deduplication_panel/deduplication_panel';
import { EntryPointsTable } from './entry_points_table';
import { SitemapsTable } from './sitemaps_table';

export const CrawlerDomainDetail: React.FC = () => {
  const { domainId } = useParams<{
    domainId: string;
  }>();

  const { indexName } = useValues(IndexNameLogic);
  const crawlerDomainDetailLogic = CrawlerDomainDetailLogic({ domainId });
  const { domain, getLoading } = useValues(crawlerDomainDetailLogic);
  const { fetchDomainData } = useActions(crawlerDomainDetailLogic);
  const { showModal } = useActions(DeleteDomainModalLogic);

  useEffect(() => {
    fetchDomainData(domainId);
  }, [domainId]);

  const domainUrl = domain?.url ?? '...';

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[...baseBreadcrumbs, indexName, domainUrl]}
      isLoading={getLoading}
      pageHeader={{
        pageTitle: domainUrl,
        rightSideItems: [
          <CrawlerStatusIndicator />,
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
            {i18n.translate('xpack.enterpriseSearch.crawler.domainDetail.deleteDomainButtonLabel', {
              defaultMessage: 'Delete domain',
            })}
          </EuiButton>,
        ],
      }}
    >
      <CrawlerStatusBanner />
      <EuiButtonTo
        data-telemetry-id="entSearchContent-crawler-domainDetail-header-allDomains"
        size="s"
        color="text"
        iconType="arrowLeft"
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
      {domain && (
        <>
          <EuiPanel paddingSize="l" hasBorder>
            <EntryPointsTable domain={domain} indexName={indexName} items={domain.entryPoints} />
          </EuiPanel>
          <EuiSpacer />
          <AuthenticationPanel />
          <EuiSpacer />
          <EuiPanel paddingSize="l" hasBorder>
            <SitemapsTable domain={domain} indexName={indexName} items={domain.sitemaps} />
          </EuiPanel>
          <EuiSpacer size="xl" />
          <EuiPanel paddingSize="l" hasBorder>
            <CrawlRulesTable
              domainId={domainId}
              indexName={indexName}
              crawlRules={domain.crawlRules}
              defaultCrawlRule={domain.defaultCrawlRule}
            />
          </EuiPanel>
          <EuiSpacer />
          <DeduplicationPanel />
        </>
      )}
      <DeleteDomainModal />
      <CrawlCustomSettingsFlyout />
    </EnterpriseSearchContentPageTemplate>
  );
};
