/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiSplitPanel,
  EuiSwitch,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ConnectorScheduling } from '../../../../../../../common/types/connectors';
import { CrawlerIndex } from '../../../../../../../common/types/indices';
import { EnterpriseSearchCronEditor } from '../../../../../shared/cron_editor/enterprise_search_cron_editor';
import { docLinks } from '../../../../../shared/doc_links/doc_links';
import { isCrawlerIndex } from '../../../../utils/indices';

interface MultiCrawlSchedulerProps {
  index: CrawlerIndex;
  interval: string;
  schedulingEnabled: boolean;
  setConnectorSchedulingInterval: (interval: ConnectorScheduling) => void;
  onSetConnectorSchedulingEnabled: (enabled: boolean) => void;
}

export const MultiCrawlScheduler: React.FC<MultiCrawlSchedulerProps> = ({
  index,
  interval,
  schedulingEnabled,
  setConnectorSchedulingInterval,
  onSetConnectorSchedulingEnabled,
}) => {
  if (!isCrawlerIndex(index)) {
    return <></>;
  }

  return (
    <>
      <EuiSplitPanel.Outer hasBorder hasShadow={false} grow>
        <EuiSplitPanel.Inner grow={false}>
          <EuiFormRow display="rowCompressed">
            <EuiTitle size="xs">
              <h3>
                {i18n.translate(
                  'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.multiCrawlSchedulingFrequency',
                  {
                    defaultMessage: 'Crawl frequency',
                  }
                )}
              </h3>
            </EuiTitle>
          </EuiFormRow>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner grow={false} color="subdued">
          <EuiFormRow display="rowCompressed">
            <EuiSwitch
              checked={schedulingEnabled}
              label={i18n.translate(
                'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.multiCrawlSchedulingEnabled',
                {
                  defaultMessage: 'Enable recurring crawls with the following schedule',
                }
              )}
              onChange={(e) => onSetConnectorSchedulingEnabled(e.target.checked)}
              compressed
            />
          </EuiFormRow>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h5>
                  {i18n.translate(
                    'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.cronSchedulingTitle',
                    {
                      defaultMessage: 'Specific time scheduling',
                    }
                  )}
                </h5>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued">
                {i18n.translate(
                  'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.cronSchedulingDescription',
                  {
                    defaultMessage:
                      'Define the frequency and time for scheduled crawls. The crawler uses UTC as its timezone.',
                  }
                )}
              </EuiText>
              <EuiHorizontalRule margin="s" />
              <EnterpriseSearchCronEditor
                disabled={!schedulingEnabled}
                scheduling={{
                  interval,
                  enabled: schedulingEnabled,
                }}
                onChange={setConnectorSchedulingInterval}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.scheduleDescription',
              {
                defaultMessage:
                  'The crawl schedule will perform a full crawl on every domain on this index.',
              }
            )}
            <EuiSpacer size="s" />
            <EuiLink href={docLinks.crawlerManaging} target="_blank" external>
              {i18n.translate(
                'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.readMoreLink',
                {
                  defaultMessage: 'Learn more about scheduling',
                }
              )}
            </EuiLink>
          </EuiText>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </>
  );
};
