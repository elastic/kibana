import { EuiTitle, EuiSpacer, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { DataPanel } from '../../../crawler_domain_detail/deduplication_panel/data_panel/data_panel';
import { CrawlRequestsTable } from './crawl_requests_table';

export const CrawlRequestsPanel: React.FC = () => (
  <DataPanel
    hasBorder
    title={
      <h2>
        {i18n.translate('xpack.enterpriseSearch.appSearch.crawler.domainsTitle', {
          defaultMessage: 'Crawl requests',
        })}
      </h2>
    }
    titleSize="s"
    iconType="documents"
    subtitle={i18n.translate('xpack.enterpriseSearch.appSearch.crawler.domainsTitle', {
      defaultMessage:
        "Recent crawl requests are logged here. You can track progress and examine crawl events in Kibana's Discover or Logs user intefaces",
    })}
    action={
      <EuiButton size="s" color="primary">
        {i18n.translate('xpack.enterpriseSearch.inlineEditableTable.newRowButtonLabel', {
          defaultMessage: 'View in Discover',
        })}
      </EuiButton>
    }
  >
    <CrawlRequestsTable />
  </DataPanel>
);
