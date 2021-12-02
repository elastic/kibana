/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import moment from 'moment';

import {
  EuiPanel,
  EuiHorizontalRule,
  EuiIconTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiStat,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ICrawlerSummaryProps {
  crawl_type: string;
  crawl_depth: number;
  domain_count: number;
  url_count?: number;
  page_count: number;
  response_time: number;
  crawl_duration: number;
}

export const CrawlDetailsSummary: React.FC<ICrawlerSummaryProps> = ({
  crawl_type,
  crawl_depth,
  domain_count,
  url_count,
  page_count,
  response_time,
  crawl_duration,
}) => {
  const duration = () => {
    const duration = moment.duration(crawl_duration, 'milliseconds');
    const hours = duration.hours();
    const minutes = duration.minutes();
    const seconds = duration.seconds();
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <EuiPanel paddingSize="l" color="primary">
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>
          <EuiStat
            titleSize="s"
            title={`${
              crawl_type[0].toUpperCase() + crawl_type.substring(1)
            } crawl on ${domain_count} ${domain_count === 1 ? 'domain' : 'domains'}`}
            description="Crawl Type"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiStat titleSize="s" title={crawl_depth} description="Max Crawl Depth" />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiStat
            titleSize="s"
            title={url_count}
            description={
              <EuiText size="s">
                URLs{' '}
                <EuiIconTip
                  type="iInCircle"
                  color="primary"
                  size="m"
                  title={i18n.translate(
                    'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsSummary.urlsTooltipTitle',
                    {
                      defaultMessage: 'URLs Seen',
                    }
                  )}
                  content={i18n.translate(
                    'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsSummary.urlsTooltip',
                    {
                      defaultMessage:
                        'URLs found by the crawler during the crawl, including those not followed due to the crawl configuration.',
                    }
                  )}
                />
              </EuiText>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            titleSize="s"
            title={page_count}
            description={
              <EuiText size="s">
                Pages{' '}
                <EuiIconTip
                  type="iInCircle"
                  color="primary"
                  size="m"
                  title={i18n.translate(
                    'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsSummary.pagesTooltipTitle',
                    {
                      defaultMessage: 'Pages visited',
                    }
                  )}
                  content={i18n.translate(
                    'xpack.enterpriseSearch.appSearch.crawler.crawlDetailsSummary.pagesTooltip',
                    {
                      defaultMessage: 'URLs visited and extracted during the crawl.',
                    }
                  )}
                />
              </EuiText>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            titleSize="s"
            title={`${Math.round(response_time)}ms`}
            description="Avg. Response"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat titleSize="s" title={duration()} description="Duration" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
