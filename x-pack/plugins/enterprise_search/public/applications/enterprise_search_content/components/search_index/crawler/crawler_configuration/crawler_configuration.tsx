/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiSplitPanel,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../../../common/types/api';
import { docLinks } from '../../../../../shared/doc_links';

import { IndexViewLogic } from '../../index_view_logic';

import { CrawlerConfigurationLogic } from './crawler_configuration_logic';

export const CrawlerConfiguration: React.FC = () => {
  const { htmlExtraction } = useValues(IndexViewLogic);
  const { status } = useValues(CrawlerConfigurationLogic);
  const { updateHtmlExtraction } = useActions(CrawlerConfigurationLogic);
  return (
    <>
      <EuiSpacer />
      <EuiSplitPanel.Outer hasBorder hasShadow={false}>
        <EuiSplitPanel.Inner>
          <EuiTitle size="s">
            <h2>
              {i18n.translate(
                'xpack.enterpriseSearch.content.crawler.crawlerConfiguration.extractHTML.title',
                { defaultMessage: 'Store full HTML' }
              )}
            </h2>
          </EuiTitle>
          <EuiSpacer />
          <EuiText size="s">
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.content.crawler.crawlerConfiguration.extractHTML.addExtraFieldDescription',
                {
                  defaultMessage:
                    'Add an extra field in all documents with the value of the full HTML of the page being crawled.',
                }
              )}
            </p>
          </EuiText>
          <EuiSpacer />
          <EuiText size="s">
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.content.crawler.crawlerConfiguration.extractHTML.increasedSizeWarning',
                {
                  defaultMessage:
                    'This may dramatically increase the index size if the site being crawled is large.',
                }
              )}
            </p>
          </EuiText>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner color="subdued">
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiSwitch
                data-telemetry-id="entSearchContent-crawler-configuration-extractHtml"
                label={i18n.translate(
                  'xpack.enterpriseSearch.content.crawler.crawlerConfiguration.extractHTML.extractionSwitchLabel',
                  {
                    defaultMessage: 'Store full HTML',
                  }
                )}
                disabled={status === Status.LOADING}
                checked={htmlExtraction ?? false}
                onChange={(event) => updateHtmlExtraction(event.target.checked)}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink
                href={`${docLinks.crawlerManaging}#crawler-managing-html-storage`}
                data-telemetry-id="entSearchContent-crawler-configuration-learnMoreExtraction"
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.content.crawler.crawlerConfiguration.extractHTML.learnMoreLink',
                  {
                    defaultMessage: 'Learn more about storing full HTML.',
                  }
                )}
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </>
  );
};
